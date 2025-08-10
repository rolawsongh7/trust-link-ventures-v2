-- Insert predefined suppliers (with conflict handling)
INSERT INTO public.suppliers (name, address, email, phone) VALUES
  ('Niah Foods Limited', '20-22 Wenlock Road, London, N1 7GU, UK', 'liz@niahfoods.com', '+44 7368356155'),
  ('AJC International', '1000 Abernathy Road NE, Suite 600, Atlanta GA, 30328, USA', 'customercare@ajc.com', '+1 4042526750'),
  ('J Marr (Seafoods) Limited', 'Livingstone Road, Hessle, East Yorkshire, UK, HU13 0EE', 'seafoods@marsea.co.uk', '+441482642302'),
  ('JAB Bros. Company LLC', '12895 NE 14 Av, North Miami, FL, 22161, USA', 'info@jab-bros.com', '+54114732.0591'),
  ('NOWACO', 'NOWACO A/S Prinsengade 15, 9000 Aalborg, Denmark', 'nowaco@nowaco.com', '+45 7788 6100'),
  ('SEAPRO SAS', '5 rue du Moulinas, 66330 Cabestany, France', 'dominique@seaprosas.com', '+33 (0)251378686')
ON CONFLICT (name) DO UPDATE SET
  address = EXCLUDED.address,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;