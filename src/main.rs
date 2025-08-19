use axum::{
    extract::{Json, State},
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

// ARM imports
// use arm::nullifier_key::NullifierKey;
use arm::resource::Resource;
// use arm::transaction::Transaction;

// State management
#[derive(Clone)]
struct AppState {
    counter_store: Arc<Mutex<HashMap<String, (Resource, arm::nullifier_key::NullifierKey)>>>,
}

#[derive(Deserialize)]
struct ExecuteRequest {
    action: String,
    user_account: String,
    signature: String,
    signed_message: String,
    timestamp: String,
}

#[derive(Serialize)]
struct ExecuteResponse {
    result: String,
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
            
            // Call the ARM function
            let (tx, resource, nf_key) = app::init::create_init_counter_tx();

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
            
            // Call the ARM increment function
            let (tx, new_resource) = app::increment::create_increment_tx(
                current_resource,
                current_nf_key.clone(),
            );
            
            // Update the stored state with new resource
            {
                let mut store = state.counter_store.lock().unwrap();
                store.insert(user_account.clone(), (new_resource.clone(), current_nf_key));
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

    println!("🚀 Emitting empty transaction for account: {}", user_account);
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

    println!("✅ Signature and message verified. Emitting empty transaction...");

    // Step 3: Create empty transaction
    let empty_tx = ProtocolAdapter::Transaction {
        actions: vec![],
        deltaProof: vec![].into(),
    };

    // Step 4: Execute the empty transaction on the Protocol Adapter
    let adapter = protocol_adapter();
    match adapter.execute(empty_tx).send().await {
        Ok(pending_tx) => {
            println!("📤 Empty transaction submitted to Ethereum Sepolia...");
            
            // Get the transaction hash before calling watch()
            let tx_hash = format!("0x{}", hex::encode(pending_tx.tx_hash()));
            
            // Wait for transaction confirmation
            match pending_tx.watch().await {
                Ok(_receipt) => {
                    println!("✅ Empty transaction confirmed! Hash: {}", tx_hash);
                    
                    Ok(Json(EmitTransactionResponse {
                        transaction_hash: tx_hash,
                        success: true,
                        message: "Empty transaction successfully executed on Ethereum Sepolia".to_string(),
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

// Helper function to extract counter value from ARM resource
fn get_counter_value(resource: &Resource) -> u128 {
    // You'll need to implement this based on your ARM Resource structure
    // This is just a placeholder
    u128::from_le_bytes(resource.value_ref[0..16].try_into().unwrap_or([0; 16]))
}

#[tokio::main]
async fn main() {
    // Create the application state
    let app_state = AppState {
        counter_store: Arc::new(Mutex::new(HashMap::new())),
    };
    
    let app = Router::new()
        .route("/execute", post(execute_function))
        .route("/merkle-proof", post(get_merkle_proof))
        .route("/protocol-status", get(get_protocol_status))
        .route("/emit-transaction", post(emit_empty_transaction))
        .with_state(app_state)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("🚀 Rust ARM backend running at http://127.0.0.1:3000");
    println!("🔗 API endpoints:");
    println!("   POST /execute - ARM counter operations");
    println!("   POST /merkle-proof - Get Merkle proof from EVM Protocol Adapter");
    println!("   GET  /protocol-status - Get EVM Protocol Adapter status");
    println!("   POST /emit-transaction - Emit empty transaction to Ethereum Sepolia");
    println!("⚛️  TypeScript frontend: http://localhost:5173 (run separately)");
    println!("💾 Counter state management: In-memory HashMap");
    println!("🔗 EVM Protocol Adapter integration: Enabled");
    
    axum::serve(listener, app).await.unwrap();
}