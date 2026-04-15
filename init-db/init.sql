CREATE DATABASE IF NOT EXISTS sojalink_dev;
CREATE DATABASE IF NOT EXISTS sojalink_test;

GRANT ALL PRIVILEGES ON sojalink_dev.* TO 'adonis'@'%';
GRANT ALL PRIVILEGES ON sojalink_test.* TO 'adonis'@'%';

FLUSH PRIVILEGES;