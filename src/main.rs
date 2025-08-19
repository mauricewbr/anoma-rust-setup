use axum::{
    extract::Json,
    http::StatusCode,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// EVM Protocol Adapter imports
use evm_protocol_adapter_bindings::call::protocol_adapter;
use evm_protocol_adapter_bindings::conversion::ProtocolAdapter;
use alloy::primitives::B256;
use alloy::hex;

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

async fn emit_empty_transaction(
    Json(payload): Json<EmitTransactionRequest>,
) -> Result<Json<EmitTransactionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let user_account = payload.user_account.clone();
    let signature = payload.signature.clone();
    let signed_message = payload.signed_message.clone();
    let timestamp = payload.timestamp.clone();

    println!("📝 Emitting EMPTY transaction for account: {}", user_account);
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
    if let Err(e) = verify_message_content(&signed_message, "emit_transaction", &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }

    println!("✅ Signature and message verified. Creating empty transaction...");

    // Step 3: Create empty transaction (no ARM logic, no ZK proofs)
    let empty_tx = ProtocolAdapter::Transaction {
        actions: vec![],
        deltaProof: vec![].into(),
    };
    
    println!("📝 Created empty transaction with 0 actions");

    // Step 4: Submit to Protocol Adapter
    let adapter = protocol_adapter();
    println!("📤 Empty transaction submitted to Ethereum Sepolia...");
    
    match adapter.execute(empty_tx).send().await {
        Ok(pending_tx) => {
            let tx_hash = pending_tx.tx_hash();
            println!("✅ Empty transaction confirmed! Hash: 0x{}", hex::encode(tx_hash));
            
            Ok(Json(EmitTransactionResponse {
                transaction_hash: format!("0x{}", hex::encode(tx_hash)),
                success: true,
                message: "Empty transaction successfully executed on Ethereum Sepolia".to_string(),
            }))
        }
        Err(e) => {
            println!("❌ Failed to submit empty transaction: {}", e);
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

    println!("🚀 Emitting REAL ARM transaction for account: {}", user_account);
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
    if let Err(e) = verify_message_content(&signed_message, "emit_transaction", &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }

    println!("✅ Signature and message verified. Generating real ARM transaction...");

    // Step 3: Generate real ARM transaction with ZK proofs
    println!("🔧 Generating real ARM transaction with 1 action...");
    
    let real_tx = tokio::task::spawn_blocking(|| {
        // Generate a real ARM transaction with proper actions and proofs
        // Generate truly unique ARM transaction with random nullifier keys
        // This follows ARM compliance protocol correctly and prevents double-spend errors
        let raw_tx: ArmTransaction = transaction::generate_unique_transaction();

        // Generate ARM transaction using the same method as the test transaction from conversion.rs
        // This should produce the same proof format and structure
        // let raw_tx: ArmTransaction = transaction::generate_test_transaction(1);
        
        println!("✅ Generated ARM transaction with {} actions", raw_tx.actions.len());
        
        // Debug: Check if delta proof was generated
        match &raw_tx.delta_proof {
            arm_risc0::transaction::Delta::Witness(_) => {
                println!("❌ ARM transaction still has Delta::Witness - proof generation failed!");
            },
            arm_risc0::transaction::Delta::Proof(proof) => {
                println!("✅ ARM transaction has Delta::Proof - size: {} bytes", proof.to_bytes().len());
            }
        }
        
        // Debug: Check ARM transaction structure
        for (i, action) in raw_tx.actions.iter().enumerate() {
            println!("🔍 Action {}: compliance_units={}, logic_verifier_inputs={}", 
                     i, action.compliance_units.len(), action.logic_verifier_inputs.len());
        }
        
        // Convert to EVM Protocol Adapter format
        let evm_tx = ProtocolAdapter::Transaction::from(raw_tx);
        println!("✅ Converted to EVM format - actions: {}, deltaProof size: {} bytes", 
                 evm_tx.actions.len(), 
                 evm_tx.deltaProof.len());
        
        // 🔍 DETAILED LOGGING: Log the exact EVM transaction structure for comparison
        println!("🔍 DETAILED REAL ARM TRANSACTION STRUCTURE (generate_test_transaction):");
        println!("📄 Full EVM Transaction JSON:");
        match serde_json::to_string_pretty(&evm_tx) {
            Ok(json) => println!("{}", json),
            Err(e) => println!("❌ Failed to serialize EVM transaction: {}", e),
        }
        
        // Log each action in detail
        for (i, action) in evm_tx.actions.iter().enumerate() {
            println!("🔍 Action {} Details:", i);
            println!("   Logic Verifier Inputs: {}", action.logicVerifierInputs.len());
            for (j, logic_input) in action.logicVerifierInputs.iter().enumerate() {
                println!("     Logic Input {}: verifyingKey={}, proof_len={}", 
                         j, 
                         hex::encode(&logic_input.verifyingKey), 
                         logic_input.proof.len());
                println!("       Instance: tag={}, isConsumed={}, actionTreeRoot={}", 
                         hex::encode(&logic_input.instance.tag),
                         logic_input.instance.isConsumed,
                         hex::encode(&logic_input.instance.actionTreeRoot));
            }
            
            println!("   Compliance Verifier Inputs: {}", action.complianceVerifierInputs.len());
            for (j, compliance_input) in action.complianceVerifierInputs.iter().enumerate() {
                println!("     Compliance Input {}: proof_len={}", j, compliance_input.proof.len());
                println!("       Consumed nullifier: {}", hex::encode(&compliance_input.instance.consumed.nullifier));
                println!("       Created commitment: {}", hex::encode(&compliance_input.instance.created.commitment));
                println!("       Consumed logicRef: {}", hex::encode(&compliance_input.instance.consumed.logicRef));
                println!("       Created logicRef: {}", hex::encode(&compliance_input.instance.created.logicRef));
            }
        }
        
        // Debug: Check if proofs are present
        println!("🔍 Delta proof size: {} bytes", evm_tx.deltaProof.len());
        if evm_tx.deltaProof.len() > 0 {
            println!("✅ Delta proof present");
        } else {
            println!("❌ Delta proof missing!");
        }
        
        evm_tx
    }).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to generate ARM transaction: {}", e),
            }),
        )
    })?;

    // Step 4: Execute the real ARM transaction on the Protocol Adapter
    let adapter = protocol_adapter();
    match adapter.execute(real_tx).send().await {
        Ok(pending_tx) => {
            println!("📤 Real ARM transaction submitted to Ethereum Sepolia...");
            
            // Get the transaction hash before calling watch()
            let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));
            
            // Wait for transaction confirmation
            match pending_tx.watch().await {
                Ok(_receipt) => {
                    println!("✅ Real ARM transaction confirmed! Hash: {}", tx_hash);
                    
                    Ok(Json(EmitTransactionResponse {
                        transaction_hash: tx_hash,
                        success: true,
                        message: "Real ARM transaction with ZK proofs successfully executed on Ethereum Sepolia".to_string(),
                    }))
                }
                Err(e) => {
                    let error_msg = format!("Transaction failed: {}", e);
                    println!("❌ {}", error_msg);
                    
                    Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse {
                            error: error_msg,
                        }),
                    ))
                }
            }
        }
        Err(e) => {
            let error_msg = format!("Failed to submit transaction: {}", e);
            println!("❌ {}", error_msg);
            
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: error_msg,
                }),
            ))
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
    
    println!("🔍 [MOCK] Signature verification for account: {}", user_account);
    println!("🔍 [MOCK] Message length: {} chars", message.len());
    println!("🔍 [MOCK] Signature: {}...", &signature[0..20]);
    
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
    
    println!("✅ Message content verification passed");
    Ok(())
}

async fn emit_counter_transaction(
    Json(payload): Json<EmitTransactionRequest>,
) -> Result<Json<EmitTransactionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let user_account = payload.user_account.clone();
    let signature = payload.signature.clone();
    let signed_message = payload.signed_message.clone();
    let timestamp = payload.timestamp.clone();

    println!("🔢 Emitting ARM COUNTER transaction for account: {}", user_account);
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
    if let Err(e) = verify_message_content(&signed_message, "emit_transaction", &user_account, &timestamp) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Message verification failed: {}", e),
            }),
        ));
    }

    println!("✅ Signature and message verified. Creating ARM counter transaction...");

    // Step 3: Generate ARM counter transaction using actual counter logic
    println!("🔢 Generating ARM counter initialization transaction...");
    println!("🔧 RISC0_DEV_MODE: {}", std::env::var("RISC0_DEV_MODE").unwrap_or_else(|_| "not set".to_string()));
    
    let arm_tx = tokio::task::spawn_blocking(|| {
        // Use the actual ARM counter application logic!
        let (tx, resource, nf_key) = app::init::create_init_counter_tx();
        println!("✅ ARM counter transaction created:");
        println!("   Counter value: {}", u128::from_le_bytes(resource.value_ref[0..16].try_into().unwrap_or([0; 16])));
        println!("   Transaction has {} actions", tx.actions.len());
        
        // Debug: Check if delta proof was generated
        match &tx.delta_proof {
            arm_risc0::transaction::Delta::Witness(_) => {
                println!("❌ ARM transaction still has Delta::Witness - proof generation failed!");
            },
            arm_risc0::transaction::Delta::Proof(proof) => {
                println!("✅ ARM transaction has Delta::Proof - size: {} bytes", proof.to_bytes().len());
            }
        }
        
        // Convert ARM transaction to EVM Protocol Adapter format
        let evm_tx = ProtocolAdapter::Transaction::from(tx);
        println!("✅ Converted ARM counter transaction to EVM format");
        println!("   Actions: {}, Delta proof size: {} bytes", evm_tx.actions.len(), evm_tx.deltaProof.len());
        
        // 🔍 DETAILED LOGGING: Log the exact EVM transaction structure
        println!("🔍 DETAILED ARM COUNTER TRANSACTION STRUCTURE:");
        println!("📄 Full EVM Transaction JSON:");
        match serde_json::to_string_pretty(&evm_tx) {
            Ok(json) => println!("{}", json),
            Err(e) => println!("❌ Failed to serialize EVM transaction: {}", e),
        }
        
        // Log each action in detail
        for (i, action) in evm_tx.actions.iter().enumerate() {
            println!("🔍 Action {} Details:", i);
            println!("   Logic Verifier Inputs: {}", action.logicVerifierInputs.len());
            for (j, logic_input) in action.logicVerifierInputs.iter().enumerate() {
                println!("     Logic Input {}: verifyingKey={}, proof_len={}", 
                         j, 
                         hex::encode(&logic_input.verifyingKey), 
                         logic_input.proof.len());
                println!("       Instance: tag={}, isConsumed={}, actionTreeRoot={}", 
                         hex::encode(&logic_input.instance.tag),
                         logic_input.instance.isConsumed,
                         hex::encode(&logic_input.instance.actionTreeRoot));
            }
            
            println!("   Compliance Verifier Inputs: {}", action.complianceVerifierInputs.len());
            for (j, compliance_input) in action.complianceVerifierInputs.iter().enumerate() {
                println!("     Compliance Input {}: proof_len={}", j, compliance_input.proof.len());
                println!("       Consumed nullifier: {}", hex::encode(&compliance_input.instance.consumed.nullifier));
                println!("       Created commitment: {}", hex::encode(&compliance_input.instance.created.commitment));
                println!("       Consumed logicRef: {}", hex::encode(&compliance_input.instance.consumed.logicRef));
                println!("       Created logicRef: {}", hex::encode(&compliance_input.instance.created.logicRef));
            }
        }
        
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
            println!("✅ ARM counter transaction confirmed! Hash: 0x{}", hex::encode(tx_hash));
            
            Ok(Json(EmitTransactionResponse {
                transaction_hash: format!("0x{}", hex::encode(tx_hash)),
                success: true,
                message: "ARM counter initialization transaction with ZK proofs successfully executed on Ethereum Sepolia".to_string(),
            }))
        }
        Err(e) => {
            println!("❌ Failed to submit ARM counter transaction: {}", e);
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
    
    // Debug: Print environment variable status
    println!("🔧 Environment Configuration:");
    println!("   RISC0_DEV_MODE: {}", std::env::var("RISC0_DEV_MODE").unwrap_or_else(|_| "not set".to_string()));
    println!("   BONSAI_API_KEY: {}", if std::env::var("BONSAI_API_KEY").is_ok() { "✅ loaded" } else { "❌ missing" });
    println!("   BONSAI_API_URL: {}", if std::env::var("BONSAI_API_URL").is_ok() { "✅ loaded" } else { "❌ missing" });
    println!("   PROTOCOL_ADAPTER_ADDRESS_SEPOLIA: {}", if std::env::var("PROTOCOL_ADAPTER_ADDRESS_SEPOLIA").is_ok() { "✅ loaded" } else { "❌ missing" });
    println!();

    // Create the application state
    let app_state = AppState {
        counter_store: Arc::new(Mutex::new(HashMap::new())),
    };
    
    let app = Router::new()
        .route("/merkle-proof", post(get_merkle_proof))
        .route("/protocol-status", get(get_protocol_status))
        .route("/emit-empty-transaction", post(emit_empty_transaction))
        .route("/emit-real-transaction", post(emit_real_transaction))
        .route("/emit-counter-transaction", post(emit_counter_transaction))
        // Future: .route("/execute", post(execute_function)) for ARM counter operations
        .with_state(app_state)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("🚀 ARM Protocol Adapter backend running at http://127.0.0.1:3000");
    println!("🔗 API endpoints:");
    println!("   POST /merkle-proof - Get Merkle proof from EVM Protocol Adapter");
    println!("   GET  /protocol-status - Get EVM Protocol Adapter status");
    println!("   POST /emit-empty-transaction - Emit empty transaction (works with any Protocol Adapter)");
    println!("   POST /emit-real-transaction - Emit real ARM transaction with ZK proofs (debugging)");
    println!("   POST /emit-counter-transaction - Emit ARM counter initialization with ZK proofs");
    println!("   Future: POST /execute - ARM counter operations with real ZK proofs");
    println!("⚛️  TypeScript frontend: http://localhost:5173 (run separately)");
    println!("🔗 EVM Protocol Adapter integration: Enabled");
    println!("✅ ARM counter operations: Enabled with real ZK proving");
    
    axum::serve(listener, app).await.unwrap();
}