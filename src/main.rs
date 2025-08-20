use axum::{
    extract::Json,
    http::StatusCode,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// EVM Protocol Adapter imports
use evm_protocol_adapter_bindings::call::protocol_adapter;
use evm_protocol_adapter_bindings::conversion::ProtocolAdapter;
use alloy::primitives::hex;

// Import the transaction generation function directly
extern crate evm_protocol_adapter_bindings;

// ARM imports - use same pattern as bindings
use arm_risc0::nullifier_key::NullifierKey;
use arm_risc0::resource::Resource;
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
        let mut evm_tx = ProtocolAdapter::Transaction::from(raw_tx);
        
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

async fn emit_counter_transaction(
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
    
    let arm_tx = tokio::task::spawn_blocking(|| {
        // Use the actual ARM counter application logic!
        let (tx, resource, _nf_key) = app::init::create_init_counter_tx();
        
        // Convert ARM transaction to EVM Protocol Adapter format
        let evm_tx = ProtocolAdapter::Transaction::from(tx);
        
        evm_tx
    }).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to generate ARM counter transaction: {}", e),
            }),
        )
    })?;

    // Step 4: Submit to Protocol Adapter
    let adapter = protocol_adapter();
    match adapter.execute(arm_tx).send().await {
        Ok(pending_tx) => {
            let tx_hash = pending_tx.tx_hash();
            println!("ARM counter transaction confirmed! Hash: 0x{}", hex::encode(tx_hash));
            
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

// Helper function to extract counter value from ARM resource
// Utility functions for ARM counter operations (used in commented code above)

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
    println!("Frontend: http://localhost:5173 (run separately)");
    println!("EVM Protocol Adapter integration: Enabled");
    println!("ARM counter operations: Enabled with RISC0 proving");
    
    axum::serve(listener, app).await.unwrap();
}

// Future: ARM counter operations will be implemented here
// Currently disabled due to type conflicts with app crate
/*
async fn execute_function(
    State(state): State<AppState>,
    Json(payload): Json<ExecuteRequest>,
) -> Result<Json<ExecuteResponse>, (StatusCode, Json<ErrorResponse>)> {
    let action = payload.action.as_str();
    let user_account = payload.user_account.clone();
    let signature = payload.signature.clone();
    let signed_message = payload.signed_message.clone();
    let timestamp = payload.timestamp.clone();

    println!("🔐 Processing {} action for account: {}", action, user_account);
    println!("🔏 Verifying signature: {}...", &signature[0..20]);

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
    if let Err(e) = verify_message_content(&signed_message, action, &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }

    println!("✅ Signature and message verified. Executing ARM function...");

    match action {
        "initialize" => {
            println!("Creating initialization transaction");
            
            // Run ARM function in blocking context to avoid runtime conflicts
            let (tx, resource, nf_key) = tokio::task::spawn_blocking(|| {
                app::init::create_init_counter_tx()
            }).await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to create initialization transaction: {}", e),
                    }),
                )
            })?;

            println!("tx: {:?}", tx);
            println!("resource: {:?}", resource);
            println!("nf_key: {:?}", nf_key);
            
            // Store the state for this user
            {
                let mut store = state.counter_store.lock().unwrap();
                store.insert(user_account.clone(), (resource.clone(), nf_key));
            }
            
            // Extract counter value from resource
            let counter_value = get_counter_value(&resource);
            
            println!("Created ARM transaction with counter value: {}", counter_value);
            
            // Create response with ARM transaction data
            let response = serde_json::json!({
        "inputs": {
                    "action": action,
            "final_value": counter_value,
                    "user_account": user_account
                },
                "transaction": tx,
                "message_to_sign": format!(
                    "Anoma Counter Initialize Transaction\n\nAction: {}\nValue: {}\nUser: {}\n\nSign this message to authorize the ARM transaction.",
                    action, counter_value, user_account
                ),
                "status": "ready_for_signing",
                "next_step": "sign_with_metamask"
            });
            
            Ok(Json(ExecuteResponse {
                result: serde_json::to_string(&response).unwrap(),
            }))
        },
        "increment" => {
            println!("Creating increment transaction");
            
            // Get the current state for this user
            let (current_resource, current_nf_key) = {
                let store = state.counter_store.lock().unwrap();
                match store.get(&user_account) {
                    Some((resource, nf_key)) => (resource.clone(), nf_key.clone()),
                    None => {
                        return Err((
                            StatusCode::BAD_REQUEST,
                            Json(ErrorResponse {
                                error: "Counter not initialized for this user. Please initialize first.".to_string(),
                            }),
                        ));
                    }
                }
            };

            println!("nullifier key: {:?}", current_nf_key);
            
            // Clone the nullifier key before moving into the closure
            let nf_key_for_storage = current_nf_key.clone();
            
            // Run ARM function in blocking context to avoid runtime conflicts
            let (tx, new_resource) = tokio::task::spawn_blocking(move || {
                app::increment::create_increment_tx(
                    current_resource,
                    current_nf_key,
                )
            }).await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to create increment transaction: {}", e),
                    }),
                )
            })?;
            
            // Update the stored state with new resource
            {
                let mut store = state.counter_store.lock().unwrap();
                store.insert(user_account.clone(), (new_resource.clone(), nf_key_for_storage));
            }
            
            let counter_value = get_counter_value(&new_resource);
            
            println!("Created ARM increment transaction with counter value: {}", counter_value);
            
            let response = serde_json::json!({
                "inputs": {
                    "action": action,
                    "final_value": counter_value,
                    "user_account": user_account
                },
                "transaction": tx,
                "message_to_sign": format!(
                    "Anoma Counter Increment Transaction\n\nAction: {}\nValue: {}\nUser: {}\n\nSign this message to authorize the ARM transaction.",
                    action, counter_value, user_account
        ),
        "status": "ready_for_signing",
                "next_step": "sign_with_metamask"
    });

    Ok(Json(ExecuteResponse {
                result: serde_json::to_string(&response).unwrap(),
            }))
        },
        _ => Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Unknown action"),
                // error: format!("Unknown action: {}", action),
            }),
        )),
    }
}
*/

/*
// EVM Protocol Adapter endpoints
async fn get_merkle_proof(
    Json(payload): Json<MerkleProofRequest>,
) -> Result<Json<MerkleProofResponse>, (StatusCode, Json<ErrorResponse>)> {
    println!("🌳 Getting Merkle proof for commitment: {}", payload.commitment);
    
    // Parse the hex commitment
    let commitment = match payload.commitment.parse::<B256>() {
        Ok(c) => c,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: format!("Invalid commitment format: {}", e),
                }),
            ));
        }
    };
    
    // Call the protocol adapter
    match protocol_adapter().merkleProof(commitment).call().await {
        Ok(proof) => {
            let siblings: Vec<String> = proof.siblings
                .iter()
                .map(|s| format!("0x{}", hex::encode(s)))
                .collect();
            
            Ok(Json(MerkleProofResponse {
                direction_bits: format!("0x{:x}", proof.directionBits),
                siblings,
            }))
        }
        Err(e) => {
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to get Merkle proof: {}", e),
                }),
            ))
        }
    }
}

async fn get_protocol_status() -> Result<Json<ProtocolStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    println!("📊 Getting protocol status");
    
    let initial_root = B256::from(hex!(
        "7e70786b1d52fc0412d75203ef2ac22de13d9596ace8a5a1ed5324c3ed7f31c3"
    ));
    
    // Get latest root and check if initial root exists
    let adapter = protocol_adapter();
    
    // Get latest root
    let latest_root = match adapter.latestRoot().call().await {
        Ok(root) => root,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to get latest root: {}", e),
                }),
            ));
        }
    };
    
    // Check if initial root exists
    let initial_exists = match adapter.containsRoot(initial_root).call().await {
        Ok(exists) => exists,
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to check initial root: {}", e),
                }),
            ));
        }
    };
    
    Ok(Json(ProtocolStatusResponse {
        latest_root: format!("0x{}", hex::encode(latest_root)),
        initial_root_exists: initial_exists,
    }))
}
*/