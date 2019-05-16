# Figlet Server

Figlet Server is a sample Web-App-DB application that renders Figlet text. 

## Installation

1. Clone this repository using Git.

2. Use NPM to install the dependencies required for this server. 

    ```bash
    npm install
    ```

## Usage

1. Set the following optional environment variables:

| Environment Variable | Description | Example |
|----------------------|-------------|---------|
| `FIGLET_SERVER_DB_URL` | Database URL | `postgres://figlet:password@db:5432/figlet` | 
| `FIGLET_SERVER_PORT` | HTTP Port to listen to | `3000` |
| `FIGLET_SERVER_CORS_WHITELISTED_DOMAINS` | Whitelisted CORS domain | `www.domain1.com,www.domain2.com` |

2. Run the following command to run the Express server.
```bash
node index.js
```


## License
[MIT](https://choosealicense.com/licenses/mit/)
