import React from 'react';
import * as Lucide from 'lucide-react';

// Mapeamento dos ícones de CATEGORY_ICONS para componentes Lucide
const LUCIDE_MAP: Record<string, React.ComponentType<any>> = {
  // 💰 Finanças
  'wallet': Lucide.Wallet,
  'money': Lucide.DollarSign,
  'coins': Lucide.Coins,
  'bank': Lucide.Landmark,
  'card': Lucide.CreditCard,
  'chart-pie': Lucide.PieChart,
  'chart-up': Lucide.TrendingUp,
  'receipt': Lucide.Receipt,
  'percent': Lucide.Percent,
  'briefcase': Lucide.Briefcase,
  'heart-handshake': Lucide.HeartHandshake,

  // 🏠 Moradia & Casa
  'home': Lucide.Home,
  'bolt': Lucide.Zap,
  'droplet': Lucide.Droplet,
  'wifi': Lucide.Wifi,
  'lightbulb': Lucide.Lightbulb,
  'tools': Lucide.Wrench,
  'building': Lucide.Building,
  'hammer': Lucide.Hammer,
  'plug': Lucide.Plug,
  'key': Lucide.Key,

  // 🍔 Alimentação
  'shopping-basket': Lucide.ShoppingBasket,
  'utensils': Lucide.Utensils,
  'coffee': Lucide.Coffee,
  'pizza': Lucide.Pizza,
  'shopping-cart': Lucide.ShoppingCart,
  'burger': Lucide.Sandwich,
  'beer': Lucide.Beer,
  'cookie': Lucide.Cookie,

  // 🚗 Transporte
  'car': Lucide.Car,
  'bus': Lucide.Bus,
  'gas-pump': Lucide.Fuel,
  'plane': Lucide.Plane,
  'parking': Lucide.CircleParking,
  'route': Lucide.Route,
  'bike': Lucide.Bike,

  // ❤️ Saúde & Bem-estar
  'medkit': Lucide.HeartPulse,
  'heart': Lucide.Heart,
  'dumbbell': Lucide.Dumbbell,
  'shield': Lucide.Shield,
  'glasses': Lucide.Glasses,
  'pill': Lucide.Pill,

  // 📚 Educação & Cultura
  'flask': Lucide.FlaskConical,
  'book': Lucide.BookOpen,
  'graduation': Lucide.GraduationCap,
  'pencil': Lucide.Pencil,

  // 🎮 Lazer & Entretenimento
  'sun': Lucide.Sun,
  'gamepad': Lucide.Gamepad2,
  'music': Lucide.Music,
  'film': Lucide.Film,
  'camera': Lucide.Camera,
  'clapperboard': Lucide.Clapperboard,
  'dices': Lucide.Dices,

  // 🛍️ Compras & Pessoal
  'shopping-bag': Lucide.ShoppingBag,
  'shirt': Lucide.Shirt,
  'scissors': Lucide.Scissors,
  'phone': Lucide.Smartphone,
  'gift': Lucide.Gift,
  'cpu': Lucide.Cpu,

  // 👨‍👩‍👧 Família & Outros
  'baby': Lucide.Baby,
  'pet': Lucide.Dog,
  'leaf': Lucide.Leaf,
  'globe': Lucide.Globe,
  'star': Lucide.Star,
  'crown': Lucide.Crown,
  'tag': Lucide.Tag,
  'box': Lucide.Package,
  'cigarette': Lucide.Cigarette,
  'umbrella': Lucide.Umbrella,
  'bone': Lucide.Bone,
};

interface CategoryIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = "h-6 w-6", style }) => {
  const IconComponent = LUCIDE_MAP[name];
  if (IconComponent) {
    return <IconComponent className={className} style={style} strokeWidth={2} />;
  }

  // Fallback para emoji ou caractere
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2em', ...style }}>
      {name}
    </span>
  );
};

export default React.memo(CategoryIcon);
