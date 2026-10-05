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
  both `delivery_partners.wallet_balance` and the driver's wallet ledger. This
  is an internal wallet credit, not a Razorpay customer charge or external
  payout. Actual road distance is not yet tracked, so final fare currently
  equals the booking estimate.

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
  the customer pays. For paid, delivered orders, vendors receive the net
  proceeds in their wallet and can receive scheduled UPI payouts.
- New home-service requests snapshot the configured
  `SHOP_COMMISSION_HOME_SERVICES_PERCENT` rate. The booking flow has no agreed
  price or service-payment settlement yet, so the commission amount is not
  calculated or collected for service requests.

## Wallet, cashback, and UPI settlement

- `POST /payments/wallet/recharge` creates a Razorpay Checkout order for ₹50
  to ₹50,000. The client completes UPI or card payment through Razorpay
  Checkout; only a signature-verified `payment.captured` webhook credits the
  wallet. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
  `RAZORPAY_WEBHOOK_SECRET`.
- `GET /wallet` and `GET /wallet/transactions` return the signed-in user's
  INR balance and ledger. `POST /wallet/orders/:id/pay` atomically debits that
  customer's wallet and marks the order paid. Peer-to-peer wallet transfers
  are intentionally not available.
- On delivery of a paid order, the vendor wallet receives the gross proceeds
  and a commission debit is posted separately, leaving the category-rate net
  balance. The customer receives configurable cashback (default 1%) once,
  after completion. Completed rides credit driver wallet earnings and ledger.
- Vendors and verified delivery partners register a UPI VPA with
  `PUT /wallet/payout-profile`. The VPA is encrypted in the application
  database; set `WALLET_PII_ENCRYPTION_KEY` to a strong deployment secret.
  RazorpayX contact/fund-account setup also requires `RAZORPAYX_KEY_ID` and
  `RAZORPAYX_KEY_SECRET`.
- Payout batches run daily at 01:15 Asia/Kolkata by default, or weekly on
  Monday with `WALLET_PAYOUT_FREQUENCY=weekly`. Set `WALLET_PAYOUTS_ENABLED=true`,
  `RAZORPAYX_ACCOUNT_NUMBER`, and `RAZORPAYX_WEBHOOK_SECRET` only after
  RazorpayX is onboarded, funded, and its webhook is configured. Payouts are
  submitted to the provider and complete asynchronously; a scheduled batch
  does not guarantee instant bank/UPI settlement. Failed/reversed payouts are
  returned to the wallet from the signed payout webhook. Admins can request a
  manual batch with `POST /wallet/admin/payout-batches`. Stuck payouts can be
  reconciled with `POST /wallet/admin/payouts/:id/reconcile`; this queries
  RazorpayX when an ID is known or retries with the same provider idempotency
  key when the initial response was ambiguous.
- Existing delivery-partner wallet balances are migrated into wallet accounts
  with opening-balance ledger entries. The ledger prevents replay of recharge,
  order, cashback, ride, and payout events.

## VIP Pass and KuchhV Coins

- `GET /loyalty` returns the customer's coin balance, VIP membership status,
  available scratch-card count, and earned badges. `GET /loyalty/transactions`
  returns the latest 100 coin-ledger entries.
- Customers can buy a 30-day VIP Pass for ₹99 from their wallet with
  `POST /loyalty/vip/subscribe`. Renewals are manual; an active membership is
  extended by 30 days. VIP orders with an item subtotal of at least ₹199 have
  the ₹30 delivery fee waived. VIP orders may also use one monthly deal: 5% off
  an item subtotal of at least ₹299, capped at ₹50. VIP orders are marked for
  priority in `GET /partner/dispatch/queue`.
- Orders accept optional `coins_to_redeem` (whole coins, one coin = ₹1) and
  `use_vip_deal` fields. Coin redemption is limited to 20% of the item
  subtotal and the customer's available balance. Benefits and redeemed coins
  are snapshotted on the order; redeemed coins and an eligible VIP deal are
  restored if the vendor rejects it.
- Paid orders earn coins worth 1% of the amount paid, credited after delivery.
  Completed rides earn coins worth 1% of the fare. Coin awards and milestone
  badges are recorded idempotently in the loyalty ledger.
- Each paid delivered order issues one scratch card. Customers list cards with
  `GET /loyalty/scratch-cards` and reveal/redeem its guaranteed 1–25 coin prize
  once with `POST /loyalty/scratch-cards/:id/scratch`. Unrevealed prize values
  are not included in the list response.

## Sponsored ads

- Vendors create sponsored listing or banner campaigns with
  `POST /ads/campaigns`. The vendor must own an active shop and have an
  approved account. Sponsored listings require an available product; banner
  images and optional links must use HTTPS.
- Each campaign selects CPC (bid in INR per click) or CPM (bid in INR per
  1,000 impressions), a category/search target, and a total budget. The budget
  is reserved from the vendor wallet at campaign creation, so ads cannot spend
  more than the funded amount. Unused budget is returned by
  `POST /ads/campaigns/:id/stop`; campaign reservations remain held until the
  vendor stops the campaign.
- Customers retrieve bid-ranked placements with
  `GET /ads/placements?placement=SPONSORED_LISTING&query=...&category=...` or
  `placement=BANNER`. Clients should record an impression only when the ad is
  actually visible and record clicks through
  `POST /ads/campaigns/:id/impressions` and
  `POST /ads/campaigns/:id/clicks`, sending a fresh `event_id`. A click must
  follow a recorded visible impression. Interactions are idempotent and limited
  to one billable impression and click per customer, campaign, and UTC day.
  CPC campaigns charge on click; CPM campaigns accrue the bid across
  impressions, rounded to paise, with campaign budget as a hard cap.
- Send the click response's `event_id` as `ad_click_id` when creating an order
  from the advertised shop. Valid customer clicks are attributed for seven
  days. Conversion value currently records the placed order total (not payment
  or delivery completion).
- Vendors list their campaigns at `GET /ads/campaigns` and fetch current
  impression, click, CTR, conversion, conversion-rate, spend, conversion-value,
  and ROAS aggregates at `GET /ads/campaigns/:id/analytics`. Analytics update
  as events/orders are recorded. The route provides dashboard data; a vendor
  dashboard UI is not included.

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
