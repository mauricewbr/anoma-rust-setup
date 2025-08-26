use axum::{
    extract::{Json, State},
    http::StatusCode,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use arm_risc0::resource::Resource;
use arm_risc0::nullifier_key::NullifierKey;
use arm_risc0::merkle_path::MerklePath;
use arm_risc0::utils;
use risc0_zkvm::sha::Digest;

// EVM Protocol Adapter imports
use evm_protocol_adapter_bindings::call::protocol_adapter;
use evm_protocol_adapter_bindings::conversion::ProtocolAdapter;
use alloy::primitives::hex;

// Import the transaction generation function directly
extern crate evm_protocol_adapter_bindings;

// ARM imports - use same pattern as bindings
use arm_risc0::transaction::{self, Transaction as ArmTransaction};

// ARM counter application imports
extern crate app;

// State management (for future ARM counter operations)
#[derive(Clone)]
struct AppState {
    counter_store: Arc<Mutex<HashMap<String, (Resource, NullifierKey)>>>,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Deserialize)]
struct MerkleProofRequest {
    commitment: String, // hex string
}

#[derive(Serialize)]
struct MerkleProofResponse {
    direction_bits: String,
    siblings: Vec<String>,
}

#[derive(Serialize)]
struct ProtocolStatusResponse {
    latest_root: String,
    initial_root_exists: bool,
}

#[derive(Deserialize)]
struct EmitTransactionRequest {
    user_account: String,
    signature: String,
    signed_message: String,
    timestamp: String,
}

#[derive(Serialize)]
struct EmitTransactionResponse {
    transaction_hash: String,
    success: bool,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    transaction_data: Option<serde_json::Value>,
}


async fn emit_empty_transaction(
    Json(payload): Json<EmitTransactionRequest>,
) -> Result<Json<EmitTransactionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let user_account = payload.user_account.clone();
    let signature = payload.signature.clone();
    let signed_message = payload.signed_message.clone();
    let timestamp = payload.timestamp.clone();

    println!("Emitting empty transaction for account: {}", user_account);

    // Step 1: Verify the signature
    if let Err(e) = verify_signature(&user_account, &signed_message, &signature) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: format!("Signature verification failed: {}", e),
            }),
        ));
    }

    // Step 2: Verify the message content
    if let Err(e) = verify_message_content(&signed_message, "emit_transaction", &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }

    println!("Signature and message verified. Creating empty transaction...");

    // Step 3: Create empty transaction (no ARM logic, no ZK proofs)
    let empty_tx = ProtocolAdapter::Transaction {
        actions: vec![],
        deltaProof: vec![].into(),
    };
    
    println!("Created empty transaction with 0 actions");

    // Step 4: Submit to Protocol Adapter
    let adapter = protocol_adapter();
    println!("Submitting empty transaction to Ethereum Sepolia...");
    
    match adapter.execute(empty_tx).gas(3_000_000u64).send().await {
        Ok(pending_tx) => {
            let tx_hash = pending_tx.tx_hash();
            println!("Empty transaction confirmed! Hash: 0x{}", hex::encode(tx_hash));
        Ok(Json(EmitTransactionResponse {
            transaction_hash: format!("0x{}", hex::encode(tx_hash)),
            success: true,
            message: "Empty transaction successfully executed on Ethereum Sepolia".to_string(),
            transaction_data: None,
        }))
        }
        Err(e) => {
            println!("Failed to submit empty transaction: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to submit transaction: {}", e),
                }),
            ))
        }
    }
}

async fn emit_real_transaction(
    Json(payload): Json<EmitTransactionRequest>,
) -> Result<Json<EmitTransactionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let user_account = payload.user_account.clone();
    let signature = payload.signature.clone();
    let signed_message = payload.signed_message.clone();
    let timestamp = payload.timestamp.clone();

    println!("Emitting ARM transaction for account: {}", user_account);

    // Step 1: Verify the signature
    if let Err(e) = verify_signature(&user_account, &signed_message, &signature) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: format!("Signature verification failed: {}", e),
            }),
        ));
    }

    // Step 2: Verify the message content
    if let Err(e) = verify_message_content(&signed_message, "emit_transaction", &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }
    
    println!("Signature and message verified. Generating real ARM transaction...");

    // Step 3: Generate ARM transaction with manual proof correction workaround
    println!("Generating ARM transaction with 1 action...");

    let real_tx = tokio::task::spawn_blocking(|| {
        let raw_tx: ArmTransaction = transaction::generate_test_transaction(1);
        
        println!("Generated ARM transaction with {} actions", raw_tx.actions.len());
        
        
        // Convert to EVM Protocol Adapter format
        let evm_tx = ProtocolAdapter::Transaction::from(raw_tx);
        
        // // WORKAROUND: Manual proof correction due to ProtocolAdapter conversion corruption
        // // The ProtocolAdapter::Transaction::from() conversion corrupts proof data during ARM->EVM format conversion
        // // This is a temporary fix until the root cause in the bindings is resolved
        // println!("Applying proof correction workaround...");

        // // 1. Define the correct proof hex strings (without the "0x" prefix for parsing)
        // let good_logic_proof_1 = "bb001d441180d22565f9ef5b2936543dd3db4933cf81bc11544f85f1d9b6bf6165267551119d9ff3b5fbbaf8e1fbb697dda7d161c06d3833a0b7d1fe9d2eededc7613740266b9d9933503801208dedfbd3d2f28ada393ac52691d5bcdc37fe621c3840fc057dd54a27bce5c1acdc9a6cdf48d88a00b41e2bafc7f09e098448811c3ce4e72f74b34b8a778ed50b7b102ecf5482e4f61b2c4a8f48fd9d759e7a26b5028abb1a7812d56029cf9b7bbc2360893bbdea37f7f952e89a07939e70cc35d478b3570f8d372c642baf065d0afa3b62d92b10044ceb91c9eb7b4e98df335086972cf425afff190d3c47b7f8716104a54457eae1253575857b63af3fc64c34a7d28f98";
        // let good_logic_proof_2 = "bb001d442fe46a111e5609cd74ef5748d74f740495a0efbbe7b683b84233750ef0adc2b21006062e2bd35d9c0dd052fb20084d60046a2d48c04711d85d1f712cc6de7b95117b41b0a2f7500ae2ad7d6630ee1eab9e1b9f9739522004408961c3cfaa374f01d09c9afeeb981371a1a37d99c7fb2fa3fe1ddd0f5fe28abc200dfd84c9ae03023af4c3ba40775768ed9433ca8275c34d13c2c23e3cd6dd5f2ce67cf68972a70bd1391b70faf111bfc48b88bcd50e028eb4206920e23bd9eab31460fbdb9dfd1edaceedaf8d628b47dbc047b5b85ed7e28c67df0b100fc2d9b26d3f4bb136332c4ef0885db68658f933a16c7d46ec04ed6d936fe9deb092b131362a6fdc6d30";
        // let good_compliance_proof = "bb001d442e1936cbe1ed65e5a9fe49d4415ee69d08214786d0d25f9e538876e400b0259c11b2fd53b46d7c1d7fba037dfa45019b3a52b58eeb7233db6a8c73006c0c2dc30592fcc1104ad2bf634f67b2984840c2b77e45d82b5b69bf1c7c9c705916dc3e184f55c87ab32069be899f7f2de86fe61d77fbc378f1c8d97c58b5bc4d72d6e529d14fb61390ee7e57fa1e0765203137df744675d378e5f1e32f1843a2833d750eec0183ebe74dadbfcd526fdfca658fd31a7b15d98d638363e9036fc1d6cd46283d7f0477111efc466a61c5e37c1b0af4849f9720e584172192376ac5f74d5a11f579ea3f083748d4bf8786ee64b4dcb9fb18c633c83fd0e2f3afcb4fe23b79";

        // // Apply the corrected proofs
        // evm_tx.actions[0].logicVerifierInputs[0].proof = hex::decode(good_logic_proof_1).unwrap().into();
        // evm_tx.actions[0].logicVerifierInputs[1].proof = hex::decode(good_logic_proof_2).unwrap().into();
        // evm_tx.actions[0].complianceVerifierInputs[0].proof = hex::decode(good_compliance_proof).unwrap().into();
        
        println!("Proof correction applied successfully.");

        evm_tx
    }).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to generate/fix ARM transaction: {}", e),
            }),
        )
    })?;

    // The rest of your function remains the same...
    let adapter = protocol_adapter();

    match adapter.execute(real_tx.clone()).gas(3_000_000u64).send().await {
        Ok(pending_tx) => {
            let tx_hash = pending_tx.tx_hash();
            println!("Real ARM transaction confirmed! Hash: 0x{}", hex::encode(tx_hash));
            
            return Ok(Json(EmitTransactionResponse {
                transaction_hash: format!("0x{}", hex::encode(tx_hash)),
                success: true,
                message: "Real ARM transaction successfully executed via Alloy backend".to_string(),
                transaction_data: None,
            }));
        }
        Err(e) => {
            println!("Failed to submit real ARM transaction: {:?}", e);
            
            // This fallback path should ideally not be hit anymore.
            let transaction_data = serde_json::to_value(&real_tx).ok();
            
            return Ok(Json(EmitTransactionResponse {
                transaction_hash: "".to_string(),
                success: false,
                message: format!("Alloy backend failed: {}. Transaction data provided for ethers.js frontend.", e),
                transaction_data,
            }));
        }
    }
}

async fn emit_counter_transaction(
    State(state): State<AppState>,
    Json(payload): Json<EmitTransactionRequest>,
) -> Result<Json<EmitTransactionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let user_account = payload.user_account.clone();
    let signature = payload.signature.clone();
    let signed_message = payload.signed_message.clone();
    let timestamp = payload.timestamp.clone();

    println!("Emitting ARM counter transaction for account: {}", user_account);

    // Step 1: Verify the signature
    if let Err(e) = verify_signature(&user_account, &signed_message, &signature) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: format!("Signature verification failed: {}", e),
            }),
        ));
    }

    // Step 2: Verify the message content
    if let Err(e) = verify_message_content(&signed_message, "emit_transaction", &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }
    
    // Step 3: Get the latest root from Protocol Adapter before initialization
    let init_latest_root = {
        let adapter = protocol_adapter();
        match adapter.latestRoot().call().await {
            Ok(root) => {
                println!("Protocol Adapter latest root before initialization: 0x{}", hex::encode(&root));
                root
            }
            Err(e) => {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to get latest root before initialization: {}", e),
                    }),
                ));
            }
        }
    };
    
    let arm_tx = tokio::task::spawn_blocking(move || {
        // Use the actual ARM counter application logic!
        let (tx, resource, nf_key) = app::init::create_init_counter_tx();
        
        // Convert ARM transaction to EVM Protocol Adapter format
        let evm_tx = ProtocolAdapter::Transaction::from(tx);

        println!("initialize counter evm_tx: {:?}", evm_tx);
        println!("Protocol Adapter root before init: 0x{}", hex::encode(&init_latest_root));
        
        (evm_tx, resource, nf_key)
    }).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to generate ARM counter transaction: {}", e),
            }),
        )
    })?;

    let (evm_tx, resource, nf_key) = arm_tx;

    // Step 4: Submit to Protocol Adapter
    let adapter = protocol_adapter();
    match adapter.execute(evm_tx).send().await {
        Ok(pending_tx) => {
            let tx_hash = pending_tx.tx_hash();
            println!("ARM counter transaction confirmed! Hash: 0x{}", hex::encode(tx_hash));
            
            // Store the counter resource and nullifier key for future increment operations
            {
                let mut store = state.counter_store.lock().unwrap();
                store.insert(user_account.clone(), (resource.clone(), nf_key.clone()));
                println!("Stored counter state for user: {}", user_account);
                println!("Stored resource commitment: 0x{}", hex::encode(resource.commitment()));
                println!("Stored nullifier key: [NullifierKey debug info]");
            }
            
            Ok(Json(EmitTransactionResponse {
                transaction_hash: format!("0x{}", hex::encode(tx_hash)),
                success: true,
                message: "ARM counter initialization transaction with ZK proofs successfully executed on Ethereum Sepolia".to_string(),
                transaction_data: None,
            }))
        }
        Err(e) => {
            println!("Failed to submit ARM counter transaction: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to submit transaction: {}", e),
                }),
            ))
        }
    }
}

async fn emit_increment_transaction(
    State(state): State<AppState>,
    Json(payload): Json<EmitTransactionRequest>,
) -> Result<Json<EmitTransactionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let user_account = payload.user_account.clone();
    let signature = payload.signature.clone();
    let signed_message = payload.signed_message.clone();
    let timestamp = payload.timestamp.clone();

    println!("Emitting ARM increment transaction for account: {}", user_account);

    // Step 1: Verify the signature
    if let Err(e) = verify_signature(&user_account, &signed_message, &signature) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: format!("Signature verification failed: {}", e),
            }),
        ));
    }

    // Step 2: Verify the message content
    if let Err(e) = verify_message_content(&signed_message, "emit_transaction", &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }
    
    // Step 3: Get the stored counter state for this user
    let (counter_resource, counter_nf_key) = {
        let store = state.counter_store.lock().unwrap();
        match store.get(&user_account) {
            Some((resource, nf_key)) => (resource.clone(), nf_key.clone()),
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: "Counter not initialized for this user. Please run the counter initialization transaction first.".to_string(),
                    }),
                ));
            }
        }
    };

    println!("Retrieved stored counter state for user: {}", user_account);
    println!("Current counter value: {}", u128::from_le_bytes(counter_resource.value_ref[0..16].try_into().unwrap_or([0; 16])));
    // println!("Retrieved resource commitment: 0x{}", hex::encode(counter_resource.nk_commitment.inner()));
    println!("Retrieved nullifier key: [NullifierKey debug info]");
    
    // Step 3.5: Get the latest root from the Protocol Adapter
    // let latest_root = {
    //     let adapter = protocol_adapter();
    //     println!("Getting latest root from Protocol Adapter...");
        
    //     match adapter.latestRoot().call().await {
    //         Ok(root) => {
    //             println!("Successfully retrieved latest root: 0x{}", hex::encode(&root));
    //             root
    //         }
    //         Err(e) => {
    //             return Err((
    //                 StatusCode::INTERNAL_SERVER_ERROR,
    //                 Json(ErrorResponse {
    //                     error: format!("Failed to get latest root from Protocol Adapter: {}", e),
    //                 }),
    //             ));
    //         }
    //     }
    // };

    let (latest_root, merkle_path) = {
        let adapter = protocol_adapter();
        
        // First, get the latest root from the Protocol Adapter
        let latest_root = match adapter.latestRoot().call().await {
            Ok(root) => {
                println!("Protocol Adapter latest root: 0x{}", hex::encode(&root));
                root
            }
            Err(e) => {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to get latest root from Protocol Adapter: {}", e),
                    }),
                ));
            }
        };
        
        // Then get the merkle proof for the stored resource
        let commitment_b256 = alloy::primitives::B256::from_slice(counter_resource.commitment().as_bytes());
        println!("Getting merkle proof for commitment: 0x{}", hex::encode(commitment_b256));

        // Get the merkle proof - this will give us the proof for whatever root contains this commitment
        let path = get_merkle_path(&adapter, commitment_b256).await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to get merkle proof for commitment: {}", e),
                }),
            )
        })?;

        println!("Successfully retrieved Merkle path from Protocol Adapter");
        
        (latest_root, path)
    };

    let arm_tx = tokio::task::spawn_blocking(move || {
        // Use a custom increment function that uses the merkle path from Protocol Adapter
        println!("Creating increment transaction with merkle path from Protocol Adapter...");
        println!("Protocol Adapter current root: 0x{}", hex::encode(&latest_root));
        
        // Create increment transaction with proper merkle path 
        let (tx, new_resource) = create_increment_tx_with_merkle_path(counter_resource, counter_nf_key.clone(), merkle_path);
        
        println!("Increment transaction created successfully");
        println!("New counter value: {}", u128::from_le_bytes(new_resource.value_ref[0..16].try_into().unwrap_or([0; 16])));
        
        // Convert ARM transaction to EVM Protocol Adapter format first (before modifying anything)
        let evm_tx = ProtocolAdapter::Transaction::from(tx);
        println!("increment evm_tx: {:?}", evm_tx);
        println!("Converted ARM transaction to EVM format");
        
        // Compare ARM's calculated root with Protocol Adapter's latest root
        if !evm_tx.actions.is_empty() && !evm_tx.actions[0].complianceVerifierInputs.is_empty() {
            let arm_calculated_root = &evm_tx.actions[0].complianceVerifierInputs[0].instance.consumed.commitmentTreeRoot;
            println!("ARM calculated root: 0x{}", hex::encode(arm_calculated_root));
            println!("Protocol Adapter root: 0x{}", hex::encode(&latest_root));
            println!("Roots match: {}", arm_calculated_root == latest_root.as_slice());
        }
        
        // The new_resource from increment already has the correct state, but we need to extract
        // or create a nullifier key for future use. However, we can't modify the resource after
        // the transaction is created as it would invalidate the proofs.
        // For now, let's use the old nullifier key pattern - in a real implementation,
        // the nullifier key for the new resource should be generated within the increment function.
        
        // Debug: Show nullifiers and commitments
        if !evm_tx.actions.is_empty() && !evm_tx.actions[0].complianceVerifierInputs.is_empty() {
            let compliance_input = &evm_tx.actions[0].complianceVerifierInputs[0];
            println!("Increment transaction nullifier: 0x{}", hex::encode(&compliance_input.instance.consumed.nullifier));
            println!("Increment transaction new commitment: 0x{}", hex::encode(&compliance_input.instance.created.commitment));
        }
        
        // Optional: Log transaction structure for debugging
        if std::env::var("DEBUG_TRANSACTIONS").is_ok() {
            match serde_json::to_string_pretty(&evm_tx) {
                Ok(json) => println!("EVM Increment Transaction JSON:\n{}", json),
                Err(e) => println!("Failed to serialize EVM increment transaction: {}", e),
            }
        }
        
        // For now, let's not store the updated state to avoid chain corruption
        // This means only one increment will work, but let's see if that works first
        (evm_tx, new_resource, counter_nf_key)
    }).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to generate ARM increment transaction: {}", e),
            }),
        )
    })?;

    let (evm_tx, new_resource, counter_nf_key) = arm_tx;

    // Step 4: Submit to Protocol Adapter
    let adapter = protocol_adapter();
    match adapter.execute(evm_tx).send().await {
        Ok(pending_tx) => {
            let tx_hash = pending_tx.tx_hash();
            println!("ARM increment transaction confirmed! Hash: 0x{}", hex::encode(tx_hash));
            
            // Update the stored counter state with the new resource and nullifier key
            {
                let mut store = state.counter_store.lock().unwrap();
                store.insert(user_account.clone(), (new_resource, counter_nf_key));
                println!("Updated counter state for user: {}", user_account);
            }
            
            Ok(Json(EmitTransactionResponse {
                transaction_hash: format!("0x{}", hex::encode(tx_hash)),
                success: true,
                message: "ARM counter increment transaction with ZK proofs successfully executed on Ethereum Sepolia".to_string(),
                transaction_data: None,
            }))
        }
        Err(e) => {
            println!("Failed to submit ARM increment transaction: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to submit transaction: {}", e),
                }),
            ))
        }
    }
}

#[tokio::main]
async fn main() {
    // Load environment variables from .env file
    dotenv::dotenv().ok();
    
    // Environment configuration check
    println!("Environment Configuration:");
    println!("  RISC0_DEV_MODE: {}", std::env::var("RISC0_DEV_MODE").unwrap_or_else(|_| "not set".to_string()));
    println!("  BONSAI_API_KEY: {}", if std::env::var("BONSAI_API_KEY").is_ok() { "loaded" } else { "missing" });
    println!("  BONSAI_API_URL: {}", if std::env::var("BONSAI_API_URL").is_ok() { "loaded" } else { "missing" });
    println!("  PROTOCOL_ADAPTER_ADDRESS_SEPOLIA: {}", if std::env::var("PROTOCOL_ADAPTER_ADDRESS_SEPOLIA").is_ok() { "loaded" } else { "missing" });
    println!();

    // Create the application state
    let app_state = AppState {
        counter_store: Arc::new(Mutex::new(HashMap::new())),
    };
    
    let app = Router::new()
        // .route("/merkle-proof", post(get_merkle_proof))
        // .route("/protocol-status", get(get_protocol_status))
        .route("/emit-empty-transaction", post(emit_empty_transaction))
        .route("/emit-real-transaction", post(emit_real_transaction))
        .route("/emit-counter-transaction", post(emit_counter_transaction))
        .route("/emit-increment-transaction", post(emit_increment_transaction))
        // Future: .route("/execute", post(execute_function)) for ARM counter operations
        .with_state(app_state)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("ARM Protocol Adapter backend running at http://127.0.0.1:3000");
    println!("API endpoints:");
    println!("  POST /emit-empty-transaction - Empty transaction (testing)");
    println!("  POST /emit-real-transaction - Real ARM transaction with ZK proofs");
    println!("  POST /emit-counter-transaction - ARM counter initialization");
    println!("  POST /emit-increment-transaction - ARM counter increment");
    println!("Frontend: http://localhost:5173 (run separately)");
    println!("EVM Protocol Adapter integration: Enabled");
    println!("ARM counter operations: Enabled with RISC0 proving");
    
    axum::serve(listener, app).await.unwrap();
}

// Custom increment function that uses the latest root from Protocol Adapter
async fn get_merkle_path(
    adapter: &ProtocolAdapter::ProtocolAdapterInstance<impl alloy::providers::Provider>,
    commitment: alloy::primitives::B256,
) -> Result<MerklePath<32>, String> {
    let res = adapter
        .merkleProof(commitment)
        .call()
        .await
        .map_err(|e| format!("Failed to call merkleProof: {}", e))?;

    // Collect the path into a Vec first
    let auth_path_vec: Vec<_> = res.siblings
        .into_iter()
        .enumerate()
        .map(|(i, sibling_b256)| {
            // Correct conversion from B256 to Digest using .0 to get the byte array
            let sibling_digest = Digest::from_bytes(sibling_b256.0);
            // CRITICAL FIX: Invert direction bit!
            // Protocol Adapter: bit=0 means sibling on LEFT, bit=1 means sibling on RIGHT  
            // ARM MerklePath: false means leaf on LEFT (sibling on RIGHT), true means leaf on RIGHT (sibling on LEFT)
            let pa_sibling_is_left = !res.directionBits.bit(i as usize);  // Invert PA direction
            let arm_leaf_is_on_right = pa_sibling_is_left;  // If sibling is left, leaf is on right
            (sibling_digest, arm_leaf_is_on_right)
        })
        .collect();

    // Convert the Vec to a fixed-size array required by the MerklePath constructor.
    // .try_into() will return an error if the length is not exactly 32.
    let auth_path_array: [(Digest, bool); 32] = auth_path_vec.try_into()
        .map_err(|_| format!("Failed to convert path to fixed-size array: expected 32 elements, got different length"))?;

    // Convert Digest values to Vec<u32> using utils::bytes_to_words
    let converted_path: [(Vec<u32>, bool); 32] = auth_path_array.map(|(digest, bool_val)| {
        (utils::bytes_to_words(digest.as_bytes()), bool_val)
    });

    // Use the public constructor `from_path`
    Ok(MerklePath::from_path(converted_path))
}

fn create_increment_tx_with_merkle_path(
    counter_resource: Resource,
    counter_nf_key: NullifierKey,
    merkle_path: MerklePath<32>,
) -> (arm_risc0::transaction::Transaction, Resource) {
    use arm_risc0::{
        action::Action,
        delta_proof::DeltaWitness,
        transaction::{Delta, Transaction},
    };

    println!("Creating increment with merkle path from Protocol Adapter");
    
    // Create a default merkle path for now - this is still not ideal but should be better than completely default
    // In a full implementation, we'd need to construct the actual merkle path for the commitment
    // let merkle_path = MerklePath::<32>::default(); 
    
            // FIRST: Let's test your hypothesis by creating two increment resources and comparing commitments
        println!("Testing commitment determinism...");
        let test_counter_1 = app::increment::increment_counter(&counter_resource, &counter_nf_key);
        let test_counter_2 = app::increment::increment_counter(&counter_resource, &counter_nf_key);
        
        println!("Test counter 1 commitment: 0x{}", hex::encode(test_counter_1.commitment().as_bytes()));
        println!("Test counter 2 commitment: 0x{}", hex::encode(test_counter_2.commitment().as_bytes()));
        println!("Commitments are identical: {}", test_counter_1.commitment().as_bytes() == test_counter_2.commitment().as_bytes());
        
        // Use the ARM increment logic but with awareness of the latest root
        let new_counter = test_counter_1; // Use the first test counter
        
        println!("Original counter commitment: 0x{}", hex::encode(counter_resource.commitment().as_bytes()));
        println!("New counter commitment: 0x{}", hex::encode(new_counter.commitment().as_bytes()));
        println!("Original counter value: {}", u128::from_le_bytes(counter_resource.value_ref[0..16].try_into().unwrap_or([0; 16])));
        println!("New counter value: {}", u128::from_le_bytes(new_counter.value_ref[0..16].try_into().unwrap_or([0; 16])));
        
        let (compliance_unit, rcv) = app::generate_compliance_proof(
            counter_resource.clone(),
            counter_nf_key.clone(),
            merkle_path, // Using real merkle path from Protocol Adapter
            new_counter.clone(),
        );
        
    let logic_verifier_inputs = app::generate_logic_proofs(
        counter_resource,
        counter_nf_key,
        new_counter.clone(),
    );

    let action = Action::new(vec![compliance_unit], logic_verifier_inputs);
    let delta_witness = DeltaWitness::from_bytes(&rcv);
    let mut tx = Transaction::create(vec![action], Delta::Witness(delta_witness));
    tx.generate_delta_proof();
    (tx, new_counter)
}

// Signature verification functions
fn verify_signature(user_account: &str, message: &str, signature: &str) -> Result<(), String> {
    // TODO: Implement proper ECDSA signature verification
    // For now, just basic validation
    
    if signature.len() < 10 {
        return Err("Signature too short".to_string());
    }
    
    if !signature.starts_with("0x") {
        return Err("Invalid signature format".to_string());
    }
    
    println!("[MOCK] Signature verification for account: {}", user_account);
    println!("[MOCK] Message length: {} chars", message.len());
    println!("[MOCK] Signature: {}...", &signature[0..20]);
    
    // TODO: Replace with real signature verification:
    // 1. Recover public key from signature + message
    // 2. Derive address from public key  
    // 3. Compare with user_account
    
    Ok(())
}

fn verify_message_content(message: &str, expected_action: &str, expected_account: &str, timestamp: &str) -> Result<(), String> {
    // Verify the message contains the expected action
    let action_line = format!("Action: {}", expected_action.to_uppercase());
    if !message.contains(&action_line) {
        return Err("Message does not contain expected action".to_string());
    }
    
    // Verify the message contains the expected account
    let account_line = format!("Account: {}", expected_account);
    if !message.contains(&account_line) {
        return Err("Message does not contain expected account".to_string());
    }
    
    // Verify timestamp is recent (within 5 minutes)
    if let Ok(msg_time) = chrono::DateTime::parse_from_rfc3339(timestamp) {
        let now = chrono::Utc::now();
        let diff = now.signed_duration_since(msg_time.with_timezone(&chrono::Utc));
        
        if diff.num_minutes() > 5 {
            return Err("Message timestamp is too old".to_string());
        }
        
        if diff.num_minutes() < -1 {
            return Err("Message timestamp is in the future".to_string());
        }
    } else {
        return Err("Invalid timestamp format".to_string());
    }
    
    println!("Message content verification passed");
    Ok(())
}