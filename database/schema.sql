CREATE DATABASE IF NOT EXISTS pesquisa_precos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pesquisa_precos;

CREATE TABLE IF NOT EXISTS stores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state CHAR(2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_store_location (name, city, state)
);

CREATE TABLE IF NOT EXISTS promotions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  brand VARCHAR(100) NULL,
  description VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  original_price DECIMAL(10,2) NOT NULL,
  promotional_price DECIMAL(10,2) NOT NULL,
  store_id INT UNSIGNED NOT NULL,
  product_url VARCHAR(500) NULL,
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at DATETIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_promotion_store FOREIGN KEY (store_id) REFERENCES stores(id),
  CONSTRAINT chk_prices CHECK (original_price > 0 AND promotional_price > 0 AND promotional_price <= original_price),
  INDEX idx_search (active, category, promotional_price),
  INDEX idx_dates (starts_at, ends_at),
  FULLTEXT INDEX ft_product (product_name, brand, description)
);

INSERT IGNORE INTO stores (id, name, city, state) VALUES
  (1, 'Supermercado Central', 'Campo Grande', 'MS'),
  (2, 'Loja Tech', 'Campo Grande', 'MS'),
  (3, 'Farmácia Popular', 'Campo Grande', 'MS');

INSERT INTO promotions
(product_name, category, brand, description, original_price, promotional_price, store_id, product_url, starts_at, ends_at)
SELECT 'Arroz Tipo 1 - 5 kg', 'Alimentos', 'Sabor do Campo', 'Pacote de 5 kg', 32.90, 24.99, 1, '#', NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY)
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE product_name='Arroz Tipo 1 - 5 kg');

INSERT INTO promotions
(product_name, category, brand, description, original_price, promotional_price, store_id, product_url, starts_at, ends_at)
SELECT 'Mouse sem fio', 'Eletrônicos', 'Connect', 'Conexão USB e bateria inclusa', 89.90, 59.90, 2, '#', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE product_name='Mouse sem fio');

INSERT INTO promotions
(product_name, category, brand, description, original_price, promotional_price, store_id, product_url, starts_at, ends_at)
SELECT 'Protetor solar FPS 50', 'Saúde', 'Dermacare', 'Frasco de 120 ml', 74.90, 54.90, 3, '#', NOW(), DATE_ADD(NOW(), INTERVAL 12 DAY)
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE product_name='Protetor solar FPS 50');
