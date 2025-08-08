use axum::{
    extract::Json,
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use arm::nullifier_key::NullifierKey;
use arm::resource::Resource;
use arm::transaction::Transaction;
use tower::ServiceBuilder;
use tower_http::services::ServeDir;

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

async fn serve_index() -> Html<String> {
    let html = tokio::fs::read_to_string("static/index.html")
        .await
        .unwrap_or_else(|_| {
            r#"
            <!DOCTYPE html>
            <html><head><title>Error</title></head>
            <body><h1>Could not load index.html</h1><p>Make sure static/index.html exists</p></body>
            </html>
            "#.to_string()
        });
    Html(html)
}

async fn execute_function(
    Json(payload): Json<ExecuteRequest>,
) -> Result<Json<ExecuteResponse>, (StatusCode, Json<ErrorResponse>)> {
    // This is where you put your server-side function logic
    // Pass the three values to the demo function
    match demo_server_function(payload.value1, payload.value2, payload.value3).await {
        Ok(result) => Ok(Json(ExecuteResponse { result })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Function execution failed: {}", e),
            }),
        )),
    }
}

async fn demo_server_function(value1: String, value2: String, value3: String) -> Result<String, Box<dyn std::error::Error>> {
    // create a counter transaction
    // figure out a message to sign in metamask
    // send message to user to sign
    // get signature back
    // create tranasction with signature
    // send transaction to PA
    let tx: (Transaction, Resource, NullifierKey) = app::init::create_init_counter_tx();

    // Create a response object that includes both the input values and the transaction
    let response = serde_json::json!({
        "inputs": {
            "value1": value1,
            "value2": value2,
            "value3": value3
        },
        "transaction": tx
    });

    // Convert the response object to JSON
    let response_json = serde_json::to_string_pretty(&response)?;
    
    Ok(response_json)
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(serve_index))
        .route("/execute", post(execute_function))
        .nest_service("/static", ServeDir::new("static"));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("🚀 Server running at http://127.0.0.1:3000");
    println!("📁 Serving static files from ./static/");
    
    axum::serve(listener, app).await.unwrap();
}
