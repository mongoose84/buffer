# buffer

This project is a demo on how to connect to a SLM from Brüel & Kjær and show data in a bar graph in React. It uses a FastAPI python proxy server to setup the device.

The documentation for the Web-XI protocol can be found here: https://github.com/hbk-world/Open-Interface-for-Sound-Level-Meter/blob/master/Documentation/SLM%20WebXi%20protocol%20specification.pdf

Below is a screenshot of the bargraph running
![alt text](Screenshot.png)

## 1st time install

#### Git
##### Mac:
use homebrew if on mac: 
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install git
```

##### Windows:
Download git installer
install python from https://www.python.org/downloads/

Also set environment variables to point to python and pip

##### Set git user
```
git config --global user.name anon

git config --global user.email anon.anonsen@pm.me
```
#### Node.js
Download and install node js installer https://nodejs.org/en/download

#### Install Visual Studio code
https://code.visualstudio.com/download

##### VS Code Extensions
Git Graph

Markdown Preview

Vue

Github actions

Python

## Running the project

#### Server

```
cd webxiproxy
```
```
python3 -m venv venv      # creates a folder named “venv”
source venv/bin/activate  # macOS / Linux / zsh
Windows PowerShell:
 .\venv\Scripts\Activate.ps1
```
```
pip install fastapi uvicorn httpx
```

Run server
```
uvicorn main:app --reload
```
#### Client
```
cd bargraph
npm install
```
Run client
```
npm start
```
