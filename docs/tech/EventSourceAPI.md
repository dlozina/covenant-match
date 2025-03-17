# EventSource API in Detail

The EventSource API is a web standard that enables servers to push real-time updates to clients over a single HTTP connection. This document explains how it works from both client and server perspectives.

## Client-Side Implementation

### Basic Usage

```javascript
// Create a new connection to an SSE endpoint
const eventSource = new EventSource('/api/events');

// Listen for messages
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received data:', data);
};

// Handle connection opening
eventSource.onopen = () => {
  console.log('Connection established');
};

// Handle errors and reconnection
eventSource.onerror = (error) => {
  console.error('EventSource failed:', error);
};

// Close the connection when done
function closeConnection() {
  eventSource.close();
}
```

### Key Features of the Client API

#### Automatic Reconnection
The EventSource automatically attempts to reconnect if the connection is dropped, with a built-in backoff mechanism. This happens without any code on your part.

#### Event Types
You can listen for specific named events:

```javascript
// Listen for a specific event type
eventSource.addEventListener('userJoined', (event) => {
  const userData = JSON.parse(event.data);
  console.log('User joined:', userData);
});

// Another event type
eventSource.addEventListener('gameStarted', (event) => {
  const gameData = JSON.parse(event.data);
  console.log('Game started:', gameData);
});
```

### Connection States
EventSource has three possible states:

- **CONNECTING (0)**: Trying to establish a connection
- **OPEN (1)**: Connection is established
- **CLOSED (2)**: Connection is closed or couldn't be opened

### Configuration Options
The EventSource constructor accepts an options object as a second parameter:

```javascript
const eventSource = new EventSource('/api/events', {
  withCredentials: true // Send cookies with cross-origin requests
});
```

## Server-Side Implementation

The server must follow specific formatting rules for SSE:

### Content Type
Server responses must use content type `text/event-stream`.

### Message Format
Each message follows this format:

```
field: value\n\n
```

### Multiple Data Lines
For multi-line data, each line starts with "data:":

```
data: line 1\n
data: line 2\n\n
```

### Rust (Actix-web) Example

```rust
async fn sse_handler() -> impl Responder {
    let stream = tokio_stream::wrappers::IntervalStream::new(
        tokio::time::interval(Duration::from_secs(1))
    )
    .map(|_| {
        let data = json!({ "time": chrono::Utc::now().to_rfc3339() });
        Ok::<_, Error>(web::Bytes::from(
            format!("data: {}\n\n", data.to_string())
        ))
    });
    
    HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .streaming(stream)
}
```

## How It Works Behind the Scenes

### Connection Establishment
When a client creates an EventSource instance:

1. The browser initiates a standard HTTP GET request to the specified URL
2. The server responds with status 200 OK and content-type text/event-stream
3. Instead of closing the connection after sending the response, the server keeps it open
4. The browser maintains this open connection, ready to receive messages

### Message Delivery
Once the connection is established:

1. The server writes messages to the response stream using the SSE format
2. The browser receives these messages and parses them according to the SSE format
3. For each complete message, the browser triggers the appropriate event handler

### Reconnection Mechanism
If the connection is lost:

1. The browser automatically attempts to reconnect after a delay
2. By default, the delay starts at ~3 seconds and may increase with repeated failures
3. The server can control the retry interval using the retry field
4. When reconnecting, the browser sends any previously received event ID in the Last-Event-ID header
5. The server can use this ID to send only messages that occurred after the last received message

### Connection Termination
The connection ends when:

- The client explicitly calls eventSource.close()
- The browser page is closed or navigated away from
- The server closes the connection (client will try to reconnect)

## Technical Benefits and Limitations

### Benefits

- **HTTP/1.1 Compatibility**: SSE works over regular HTTP/1.1 which makes it compatible with existing infrastructure.
- **Backpressure Handling**: The streaming nature means the server can naturally manage backpressure.
- **Message IDs and Resumability**: The ID mechanism allows clients to resume where they left off after reconnection.
- **Standardized Format**: The message format is standardized, unlike WebSockets where you define your own protocol.

### Limitations

- **Header Overhead**: Each SSE message carries HTTP overhead, making it less efficient for high-frequency updates.
- **Maximum Connections**: Browsers limit concurrent connections to the same domain (typically 6).
- **Unidirectional Communication**: SSE is server-to-client only; you need separate HTTP requests for client-to-server communication.
- **Text-Only**: SSE is designed for text data, though you can send JSON-encoded binary data as base64.

## Using EventSource in Your Application

For your matchmaking app, here's how you might implement different event types:

```javascript
const eventSource = new EventSource(`/api/sessions/${sessionId}/events`);

// Different event types
eventSource.addEventListener('joinRequest', (event) => {
  const player = JSON.parse(event.data);
  // Show join request in UI
});

eventSource.addEventListener('playerJoined', (event) => {
  const player = JSON.parse(event.data);
  // Update player list
});

eventSource.addEventListener('sessionReady', (event) => {
  const { password } = JSON.parse(event.data);
  // Display password and change UI state
});

eventSource.addEventListener('gameStarted', (event) => {
  // Update UI to "in-game" state
});

eventSource.addEventListener('outcomeReported', (event) => {
  const { player, outcome } = JSON.parse(event.data);
  // Show in reports section
});

// Handle connection issues
eventSource.onerror = () => {
  // Show reconnection message
};
```

## Using eventsource-polyfill for Secure Authentication

Let me explain in detail how the eventsource-polyfill approach works, what benefits it provides, and any potential downsides.

### How eventsource-polyfill Works

The standard EventSource API has a major limitation: it doesn't allow you to customize HTTP headers. The eventsource-polyfill library provides an enhanced implementation that extends the native EventSource with the ability to set custom headers, including authorization headers.

https://www.npmjs.com/package/event-source-polyfill

https://www.npmjs.com/package/@types/event-source-polyfill

https://github.com/Yaffle/EventSource

https://security.snyk.io/package/npm/event-source-polyfill

```javascript
npm install eventsource-polyfill
```

```javascript
import EventSource from 'eventsource-polyfill';
```
### Benefits of using eventsource-polyfill

- **Customizable Headers**: Allows you to set custom headers, including authorization headers.
- **Compatibility**: Works with older browsers that don't support the standard EventSource API.
- **Security**: Provides a secure way to authenticate and authorize EventSource connections.

### Connection Management

Implement the following strategies to manage SSE connections efficiently:

- Client-side reconnection logic with exponential backoff
- Server-side heartbeats every 30-60 seconds to keep connections alive
- Connection cleanup for abandoned sessions
- Monitoring for connection counts and resource usage

### Monitoring

Implement monitoring to track connection counts and resource usage. This helps identify and address issues early.


