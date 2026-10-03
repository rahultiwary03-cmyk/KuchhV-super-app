# Real-time events

The gateway uses Socket.IO on the same host and port as the HTTP API. Clients
must authenticate at connection time with their KuchhV access token:

```js
const socket = io(API_BASE_URL, {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

Browser origins are controlled by `WEBSOCKET_CORS_ORIGINS` in `.env` as a
comma-separated list. Requests without an `Origin` header (such as native
mobile clients) are allowed; every socket still requires a valid access token.

## Events

- `join_order` with `{ orderId }`: customers may join their own order, assigned
  delivery partners may join their assigned order, and admins may join any
  order.
- `order_status_changed` sends `{ orderId, status }` to authorized order-room
  members after a vendor status update, partner assignment, or successful
  payment capture.
- `update_location` with `{ orderId, latitude, longitude }`: only the verified,
  online partner assigned to the order may send live coordinates.
  `partner_location_updated` sends `{ partnerId, lat, lng }` to the order room.
- Verified, online delivery partners join the request feed. New
  `new_custom_request` events contain `{ request_id, item_description,
  offered_price, created_at }`.

The custom-request feed currently targets all connected, verified, online
partners; geographic filtering is not available because custom requests do not
store a location.
