
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  price NUMERIC NOT NULL,
  beds INT NOT NULL,
  baths NUMERIC NOT NULL,
  sqft INT NOT NULL,
  property_type TEXT NOT NULL,
  listing_type TEXT NOT NULL DEFAULT 'sale',
  description TEXT,
  image_url TEXT,
  images TEXT[],
  latitude NUMERIC,
  longitude NUMERIC,
  year_built INT,
  lot_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon, authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Properties viewable by everyone" ON public.properties FOR SELECT USING (true);

CREATE INDEX properties_city_idx ON public.properties(city);
CREATE INDEX properties_price_idx ON public.properties(price);
CREATE INDEX properties_listing_type_idx ON public.properties(listing_type);

-- favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed properties
INSERT INTO public.properties (address, city, state, zip, price, beds, baths, sqft, property_type, listing_type, description, image_url, latitude, longitude, year_built, lot_size) VALUES
('1247 Marina Blvd', 'San Francisco', 'CA', '94123', 2495000, 3, 2.5, 2100, 'Single Family', 'sale', 'Stunning marina view home with modern renovations throughout.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 37.8058, -122.4368, 1925, 3200),
('892 Ocean Drive', 'Miami', 'FL', '33139', 1850000, 4, 3, 2800, 'Condo', 'sale', 'Beachfront luxury condo with panoramic ocean views.', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 25.7817, -80.1300, 2018, 0),
('456 Park Avenue', 'New York', 'NY', '10022', 3200000, 2, 2, 1450, 'Condo', 'sale', 'Elegant Upper East Side residence steps from Central Park.', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 40.7614, -73.9776, 1985, 0),
('789 Sunset Blvd', 'Los Angeles', 'CA', '90028', 1650000, 3, 2, 1900, 'Single Family', 'sale', 'Mid-century modern gem in the heart of Hollywood Hills.', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', 34.0983, -118.3267, 1962, 4500),
('321 Lakeshore Dr', 'Chicago', 'IL', '60611', 985000, 2, 2, 1650, 'Condo', 'sale', 'High-rise condo with breathtaking Lake Michigan views.', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 41.8955, -87.6244, 2005, 0),
('55 Beacon Hill', 'Boston', 'MA', '02108', 2100000, 3, 2.5, 2200, 'Townhouse', 'sale', 'Historic Beacon Hill townhouse with original details.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 42.3588, -71.0707, 1890, 1800),
('1010 Rainier Ave', 'Seattle', 'WA', '98144', 875000, 3, 2, 1750, 'Single Family', 'sale', 'Craftsman home with mountain views and updated kitchen.', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800', 47.5850, -122.2986, 1948, 5200),
('2200 South Congress', 'Austin', 'TX', '78704', 725000, 3, 2, 1850, 'Single Family', 'sale', 'Trendy South Congress neighborhood, walkable to everything.', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800', 30.2500, -97.7500, 1955, 6000),
('88 Pearl Street', 'Denver', 'CO', '80203', 649000, 2, 2, 1400, 'Condo', 'sale', 'Modern downtown condo with rooftop terrace access.', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 39.7392, -104.9903, 2019, 0),
('4567 Bourbon St', 'New Orleans', 'LA', '70116', 550000, 3, 2, 2100, 'Single Family', 'sale', 'French Quarter charm with courtyard and balcony.', 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800', 29.9584, -90.0644, 1892, 2400),
('99 Peachtree Rd', 'Atlanta', 'GA', '30309', 495000, 4, 3, 2600, 'Single Family', 'sale', 'Midtown home with modern updates and large backyard.', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 33.7900, -84.3800, 1975, 8000),
('1500 Camelback Rd', 'Phoenix', 'AZ', '85014', 585000, 3, 2, 2000, 'Single Family', 'sale', 'Desert oasis with pool and mountain views.', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 33.5100, -112.0800, 1998, 7200),
('345 Nob Hill', 'San Francisco', 'CA', '94108', 4500, 2, 1, 1100, 'Apartment', 'rent', 'Charming Nob Hill apartment, city views, walk to everything.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 37.7930, -122.4161, 1928, 0),
('1234 Brickell Ave', 'Miami', 'FL', '33131', 3800, 1, 1, 850, 'Apartment', 'rent', 'Modern Brickell high-rise, bay views, amenities.', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 25.7620, -80.1918, 2020, 0),
('567 W 23rd St', 'New York', 'NY', '10011', 5200, 1, 1, 750, 'Apartment', 'rent', 'Chelsea loft-style apartment with exposed brick.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 40.7465, -74.0000, 1920, 0),
('890 Venice Blvd', 'Los Angeles', 'CA', '90291', 3500, 2, 2, 1200, 'Apartment', 'rent', 'Steps from Venice Beach, modern finishes.', 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800', 33.9950, -118.4600, 2015, 0),
('222 Wicker Park', 'Chicago', 'IL', '60622', 2400, 2, 1, 1050, 'Apartment', 'rent', 'Trendy Wicker Park two-bedroom with laundry in unit.', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 41.9088, -87.6796, 1910, 0),
('700 Massachusetts Ave', 'Cambridge', 'MA', '02139', 3200, 2, 1, 1000, 'Apartment', 'rent', 'Near Harvard and MIT, updated kitchen.', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800', 42.3670, -71.1050, 1935, 0),
('45 Rainier Way', 'Seattle', 'WA', '98101', 2800, 1, 1, 800, 'Apartment', 'rent', 'Downtown Seattle high-rise with Sound views.', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 47.6062, -122.3321, 2018, 0),
('1200 Rainey St', 'Austin', 'TX', '78701', 2600, 2, 2, 1150, 'Apartment', 'rent', 'Rainey Street district, walkable and lively.', 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800', 30.2600, -97.7400, 2017, 0),
('333 16th St Mall', 'Denver', 'CO', '80202', 2200, 1, 1, 700, 'Apartment', 'rent', 'Downtown Denver loft with mountain views.', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 39.7460, -104.9990, 2016, 0),
('12 Georgetown Rd', 'Washington', 'DC', '20007', 1250000, 3, 2.5, 1900, 'Townhouse', 'sale', 'Historic Georgetown townhouse, beautifully restored.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 38.9076, -77.0723, 1875, 1600),
('66 Rittenhouse Sq', 'Philadelphia', 'PA', '19103', 875000, 2, 2, 1600, 'Condo', 'sale', 'Rittenhouse Square condo with park views.', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 39.9490, -75.1720, 1928, 0),
('808 Ala Moana', 'Honolulu', 'HI', '96813', 1450000, 2, 2, 1400, 'Condo', 'sale', 'Oceanfront Honolulu condo with panoramic views.', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 21.3069, -157.8583, 2010, 0);
