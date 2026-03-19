# 📚 StudyMateHub

Welcome to **StudyMateHub**, an intelligent, Python-based AI tool designed to elevate and streamline the learning experience. This repository contains the complete source code, featuring a dynamic frontend client and a powerful AI-driven backend, supported by a scalable Supabase database architecture.

## 🚀 Live Demo
Experience the platform live: **[StudyMateHub on Vercel](https://studymatehub.vercel.app)**

## 🏗️ Project Structure
This full-stack application is divided into two primary environments:
* **`/client`**: The JavaScript-based frontend user interface.
* **`/server`**: The Python-based backend, housing the AI logic and API endpoints.

## 💻 Tech Stack
* **Frontend**: JavaScript, CSS
* **Backend**: Python
* **Database**: Supabase
* **Deployment**: Vercel

## 🛠️ Installation & Setup
Follow this step-by-step guide to get the project running on your local machine.

### Prerequisites
Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (for the frontend client)
* [Python 3.8+](https://www.python.org/) (for the backend server)
* A [Supabase](https://supabase.com/) account with an active project

### Step 1: Clone the Repository
```bash
git clone [https://github.com/arikaleeswaran/StudyMateHub.git](https://github.com/arikaleeswaran/StudyMateHub.git)
cd StudyMateHub
```

### Step 2: Backend Setup (Server)
Navigate to the server directory, set up your virtual environment, and install the required Python dependencies.
```bash
cd server
python -m venv venv

# Activate the virtual environment:
# On macOS/Linux:
source venv/bin/activate  
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```
> **Environment Variables:** Create a `.env` file in the `/server` directory and add your Supabase connection strings, API keys, and any required AI provider tokens.

### Step 3: Frontend Setup (Client)
Open a new terminal window, navigate to the client directory, and install the necessary Node modules.
```bash
cd client
npm install
```
> **Environment Variables:** If your client requires environment variables (like a Vercel or Supabase anon key), create a `.env` file in the `/client` directory.

### Step 4: Running the Application Locally

**1. Start the Backend Server:**
```bash
cd server
# Execute your standard run command (e.g., uvicorn, flask run, or python main.py)
python main.py 
```

**2. Start the Frontend Client:**
```bash
cd client
# Execute your start command (e.g., npm start or npm run dev)
npm run dev
```
Navigate to the local host URL provided in your terminal (usually `http://localhost:3000` or `http://localhost:5173`) to view the app!

## 🤝 Contributing
Contributions, issues, and feature requests are always welcome! 
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 📧 Contact
**Project Link:** [https://github.com/arikaleeswaran/StudyMateHub](https://github.com/arikaleeswaran/StudyMateHub)
