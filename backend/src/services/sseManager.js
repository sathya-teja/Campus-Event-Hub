/*
========================================
📡 SSE MANAGER
Manages all active SSE client connections.
Allows pushing real-time notifications to
specific users without polling.
========================================
*/

// Map of userId (string) → array of SSE response objects
// One user can have multiple tabs open, so we store an array
const clients = new Map();

/*
  addClient(userId, res)
  Called when a user opens an SSE connection.
*/
export const addClient = (userId, res) => {
  const id = userId.toString();
  if (!clients.has(id)) {
    clients.set(id, []);
  }
  clients.get(id).push(res);
  console.log(`📡 SSE client connected: ${id} (total tabs: ${clients.get(id).length})`);
};

/*
  removeClient(userId, res)
  Called when a user closes their tab or disconnects.
*/
export const removeClient = (userId, res) => {
  const id = userId.toString();
  if (!clients.has(id)) return;

  const updated = clients.get(id).filter((client) => client !== res);
  if (updated.length === 0) {
    clients.delete(id);
  } else {
    clients.set(id, updated);
  }
  console.log(`📡 SSE client disconnected: ${id}`);
};

/*
  sendToUser(userId, data)
  Push a notification event to all tabs of a specific user.
  data should be a plain JS object — it will be JSON stringified.
*/
export const sendToUser = (userId, data) => {
  const id = userId.toString();
  if (!clients.has(id)) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.get(id).forEach((res) => {
    try {
      res.write(message);
    } catch (err) {
      console.error(`❌ SSE write error for user ${id}:`, err.message);
    }
  });
};

/*
  sendToAll(data)
  Broadcast to ALL connected users.
  Useful for events like new event created.
*/
export const sendToAll = (data) => {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((responses, userId) => {
    responses.forEach((res) => {
      try {
        res.write(message);
      } catch (err) {
        console.error(`❌ SSE broadcast error for user ${userId}:`, err.message);
      }
    });
  });
};

/*
  getConnectedCount()
  Utility for debugging — returns number of connected users.
*/
export const getConnectedCount = () => clients.size;
