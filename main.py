from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
from typing import Optional

app = FastAPI()

# Browser ko permission dene ke liye (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# ==========================================
# GOOGLE SHEETS CONNECTION SETUP
# ==========================================
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
client = gspread.authorize(creds)

# Charo tabs ko backend mein alag-alag connect kiya gaya hai
sheet_users = client.open("SUPER APP").worksheet("Users")
sheet_products = client.open("SUPER APP").worksheet("Products")
sheet_orders = client.open("SUPER APP").worksheet("Orders")
sheet_rides = client.open("SUPER APP").worksheet("Rides")
# ==========================================

# ------------------------------------------
# DATA STRUCTURES (Har Category ka Format)
# ------------------------------------------
class UserData(BaseModel):
    name: str
    phone: str
    role: str
    wallet_balance: str

class ProductData(BaseModel):
    shop_name: str
    item_name: str
    price: str
    category: str
    status: str

class OrderData(BaseModel):
    customer_name: str
    items: str
    total_amount: str
    cod_status: str

class RideData(BaseModel):
    ride_name: str
    pickup: str = "Pending"
    drop: str = "Pending"
    price: int

# ------------------------------------------
# ALAG-ALAG CATEGORY KE ENDPOINTS (ROUTES)
# ------------------------------------------

# 1. Naya User add karne ke liye
@app.post("/add_user")
async def add_user(data: UserData):
    row = [data.name, data.phone, data.role, data.wallet_balance]
    sheet_users.append_row(row)
    print(f"✅ User saved: {data.name} in 'Users' Tab")
    return {"message": "Success", "tab": "Users"}

# 2. Naya Product add karne ke liye
@app.post("/add_product")
async def add_product(data: ProductData):
    row = [data.shop_name, data.item_name, data.price, data.category, data.status]
    sheet_products.append_row(row)
    print(f"✅ Product saved: {data.item_name} in 'Products' Tab")
    return {"message": "Success", "tab": "Products"}

# 3. Naya Order add karne ke liye
@app.post("/add_order")
async def add_order(data: OrderData):
    order_id = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    row = [order_id, data.customer_name, data.items, data.total_amount, data.cod_status]
    sheet_orders.append_row(row)
    print(f"✅ Order saved for: {data.customer_name} in 'Orders' Tab")
    return {"message": "Success", "tab": "Orders"}

# 4. Nayi Ride add karne ke liye
@app.post("/add_ride")
async def add_ride(data: RideData):
    row = [data.ride_name, data.pickup, data.drop, f"₹{data.price}", "Booked"]
    sheet_rides.append_row(row)
    print(f"✅ Ride saved for: {data.ride_name} in 'Rides' Tab")
    return {"message": "Success", "tab": "Rides"}

# ==========================================
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)