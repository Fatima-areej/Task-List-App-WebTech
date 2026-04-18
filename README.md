# Task List App — MERN Stack

## Requirements to run this project
- Node.js (v18 or higher)
- MongoDB (running locally)

## Setup Instructions

### 1. Clone the project
git clone https://github.com/YOUR-USERNAME/task-list-app.git
cd task-list-app

### 2. Setup Backend
cd server
npm install
Create a .env file with:
  PORT=5000
  MONGO_URI=mongodb://localhost:27017/tasklistdb
npm run dev

### 3. Setup Frontend (new terminal)
cd client
npm install
npm start