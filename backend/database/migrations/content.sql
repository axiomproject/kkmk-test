CREATE TABLE story_content (
  id SERIAL PRIMARY KEY,
  section_order INTEGER NOT NULL,
  title VARCHAR(255),
  content_text TEXT NOT NULL,
  image_url TEXT,
  image_caption VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE banner_images (
  id SERIAL PRIMARY KEY,
  page_name VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
