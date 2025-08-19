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
    value1: String,
    value2: String,
    value3: String,
}

#[derive(Serialize)]
struct ExecuteResponse {
    result: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

async fn execute_function(
    State(state): State<AppState>,
    Json(payload): Json<ExecuteRequest>,
) -> Result<Json<ExecuteResponse>, (StatusCode, Json<ErrorResponse>)> {
    let action = payload.value1.as_str();
    let current_value = payload.value2.parse::<u64>().unwrap_or(0);
    let user_account = payload.value3.clone();

    println!("Processing {} action for account: {}", action, user_account);

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
        .with_state(app_state)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("🚀 Rust ARM backend running at http://127.0.0.1:3000");
    println!("🔗 API endpoint: POST /execute");
    println!("⚛️  TypeScript frontend: http://localhost:5173 (run separately)");
    println!("💾 Counter state management: In-memory HashMap");
    
    axum::serve(listener, app).await.unwrap();
}