curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh -o install_nvm.sh
chmod 777 install_nvm.sh
bash install_nvm.sh
source ~/.profile
nvm install v8.11.1



mongo
-----
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list

sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
db.createUser(
  {
    user: "easygaadi",
    pwd: "Easygaadi@123",
    roles: ["readWrite"]
  }
)

----Edit /etc/mongod.conf to
security:
  authorization: enabled


attach security group to EC2 instance.

sudo service mongod restart

install nginx

server {
    listen 80;

    server_name demo.easygaadi.com cpanel.easygaadi.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
	proxy_set_header  X-Real-IP $remote_addr;
	proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

