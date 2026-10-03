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
- Ride requests are sent as `new_ride_request` only to verified, online drivers
  of the requested vehicle type whose recorded GPS location is within
  `RIDE_MATCH_RADIUS_KM`. Customers and assigned drivers receive
  `ride_status_changed` updates.

The custom-request feed currently targets all connected, verified, online
partners; geographic filtering is not available because custom requests do not
store a location.

## Ride hailing

- Customers book with `POST /rides/book`, supplying pickup/drop coordinates and
  `vehicle_type` (`BIKE`, `AUTO`, or `CAB`). The fare estimate uses straight-line
  Haversine distance, a per-vehicle base fare and per-kilometre rate, and INR.
- Defaults are Bike ₹20 + ₹8/km, Auto ₹30 + ₹12/km, and Cab ₹50 + ₹18/km.
  Override these with `RIDE_BIKE_BASE_FARE`, `RIDE_BIKE_PER_KM`,
  `RIDE_AUTO_BASE_FARE`, `RIDE_AUTO_PER_KM`, `RIDE_CAB_BASE_FARE`,
  `RIDE_CAB_PER_KM`, `RIDE_MATCH_RADIUS_KM` (default 5), and
  `RIDE_PLATFORM_COMMISSION_PERCENT` (default 20).
- Online, KYC-verified drivers with matching vehicles can accept once. The
  customer requests a four-digit start OTP at `POST /rides/:id/start-otp`;
  only the assigned driver can verify it at `PATCH /rides/:id/start`.
- `PATCH /rides/:id/complete` settles the estimated fare: platform commission
  is deducted and the driver's share is atomically credited to
  `delivery_partners.wallet_balance`. This is an internal wallet credit, not a
  Razorpay customer charge or external payout. Actual road distance is not yet
  tracked, so final fare currently equals the booking estimate.

## Category-wise shop commission

- New shops receive a commission rate automatically from their category:
  Groceries & Daily Essentials 6%, Restaurants & Fast Food 11%, Pharmacies &
  Medicines 5%, Home Services & Repairs 10%. Unrecognized categories use 10%.
- Rates can be adjusted before onboarding through
  `SHOP_COMMISSION_GROCERIES_PERCENT`, `SHOP_COMMISSION_RESTAURANTS_PERCENT`,
  `SHOP_COMMISSION_PHARMACIES_PERCENT`, `SHOP_COMMISSION_HOME_SERVICES_PERCENT`,
  and `SHOP_COMMISSION_DEFAULT_PERCENT`. Values must be between 0 and 100.
- The assigned rate is stored on the shop and is not vendor-editable. Each new
  order snapshots that rate and its commission amount, so later policy changes
  do not rewrite existing order terms. Existing orders retain a zero snapshot;
  the migration does not retroactively charge commission.
- Commission is recorded against the product subtotal and does not change what
  the customer pays. Vendor payout/settlement is not yet implemented.
- New home-service requests snapshot the configured
  `SHOP_COMMISSION_HOME_SERVICES_PERCENT` rate. The booking flow has no agreed
  price or service-payment settlement yet, so the commission amount is not
  calculated or collected for service requests.

## Marketplace and verification workflow

- Catalog checkout requires a `shop_id`; every item must belong to that shop.
- The shop owner alone may accept/reject its order or move an accepted order
  into preparation. A prepared order can be assigned by an admin, after which
  the vendor issues a pickup OTP and the assigned delivery partner verifies it.
- The customer issues a handover OTP once the order is out for delivery; only
  the assigned delivery partner can verify it and complete the order.
- Customers create isolated service requests. A Service Provider accepts a
  request, starts it, and verifies the customer's service-completion OTP.
- Workflow OTPs are single-use, expire after five minutes, and lock after five
  failed attempts. Until an SMS gateway is configured, codes are logged and
  returned only in non-production development responses. Production code
  issuance fails closed with HTTP 503.
