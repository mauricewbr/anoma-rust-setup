use axum::{
    extract::Json,
    http::StatusCode,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::{services::ServeDir, cors::CorsLayer};

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
    Json(payload): Json<ExecuteRequest>,
) -> Result<Json<ExecuteResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Mock counter logic for testing
    let current_value = payload.value2.parse::<u64>().unwrap_or(0);
    let counter_value = match payload.value1.as_str() {
        "initialize" => 0,
        "increment" => current_value + 1,
        "decrement" => if current_value > 0 { current_value - 1 } else { 0 },
        _ => 42
    };

    // Simple mock response for testing that includes expected transaction structure
    let mock_response = serde_json::json!({
        "inputs": {
            "action": payload.value1,
            "final_value": counter_value,
            "user_account": payload.value3
        },
        "transaction": [
            {
                "mock_transaction_id": "tx_123456",
                "action": payload.value1,
                "value": counter_value
            }
        ],
        "message_to_sign": format!("Anoma Counter {} Transaction\n\nAction: {}\nValue: {}\nUser: {}\n\nSign this message to authorize the transaction.", 
            payload.value1.chars().next().unwrap().to_uppercase().collect::<String>() + &payload.value1[1..],
            payload.value1,
            counter_value,
            payload.value3
        ),
        "status": "ready_for_signing",
        "next_step": "sign_with_metamask",
        "protocol_adapter": {
            "verification": "verified",
            "submission": {
                "status": "submitted",
                "tx_hash": "0x1234567890abcdef",
                "pa_contract": "0xC5033726a1fb969743A6f5Baf1753D56c6e1692b",
                "chain_id": 421614
            }
        },
        "timestamp": "2024-01-01T00:00:00Z",
        "message": "🎯 Simplified test version with MetaMask integration!"
    });

    Ok(Json(ExecuteResponse {
        result: serde_json::to_string(&mock_response).unwrap(),
    }))
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/execute", post(execute_function))
        .nest_service("/static", ServeDir::new("static"))
        .layer(CorsLayer::permissive()); // Allow all origins for development

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("🚀 Server running at http://127.0.0.1:3000");
    println!("📁 Frontend available at: http://127.0.0.1:3000/static/index.html");
    println!("🔗 API endpoint: POST /execute");
    
    axum::serve(listener, app).await.unwrap();
}
