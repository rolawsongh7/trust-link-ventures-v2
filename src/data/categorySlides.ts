import { Fish, Beef, Package } from 'lucide-react';
import premiumSeafoodImg from '@/assets/premium-seafood.jpg';
import beefLambImg from '@/assets/beef-lamb.jpg';
import freshPoultryImg from '@/assets/fresh-poultry.jpg';
import qualityPorkImg from '@/assets/quality-pork.jpg';

export const categorySlides = [
  {
    title: 'Premium Seafood',
    description: 'Ocean-fresh selections from sustainable fisheries worldwide',
    image: premiumSeafoodImg,
    icon: Fish
  },
  {
    title: 'Grass-Fed Beef & Lamb',
    description: 'Premium cuts from pasture-raised livestock',
    image: beefLambImg,
    icon: Beef
  },
  {
    title: 'Fresh Poultry',
    description: 'Free-range and naturally raised poultry products',
    image: freshPoultryImg,
    icon: Package
  },
  {
    title: 'Quality Pork',
    description: 'Heritage breed pork from trusted farms',
    image: qualityPorkImg,
    icon: Package
  }
];