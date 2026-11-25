export type CropType =
  | 'Corn'
  | 'Wheat'
  | 'Soybeans'
  | 'Rice'
  | 'Cotton'
  | 'Alfalfa'
  | 'Tomatoes'
  | 'Potatoes'
  | 'Grapes'
  | 'Almonds'
  | 'Sunflower'
  | 'Barley'
  | 'Other';

export type SoilType =
  | 'Clay'
  | 'Sandy'
  | 'Loam'
  | 'Silty Loam'
  | 'Peat'
  | 'Chalky'
  | 'Saline'
  | 'Unknown';

export type IrrigationMethod =
  | 'Drip'
  | 'Sprinkler'
  | 'Center Pivot'
  | 'Flood'
  | 'Furrow'
  | 'Dryland'
  | 'Subsurface'
  | 'None';

export type IrrigationPointType =
  | 'Drip Valve'
  | 'Sprinkler Head'
  | 'Center Pivot'
  | 'Canal Intake'
  | 'Water Source'
  | 'Pump Station'
  | 'Reservoir';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  owner: string;
  location: string;
  center_lat: number;
  center_lng: number;
  boundary: GeoJSONPolygon | null;
  area_hectares: number;
  area_acres: number;
  crop_type: CropType | string;
  planting_date: string | null;
  soil_type: SoilType | string;
  irrigation_method: IrrigationMethod | string;
  notes: string;
  photo_url: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FarmInput {
  name: string;
  owner: string;
  location: string;
  center_lat: number;
  center_lng: number;
  boundary: GeoJSONPolygon | null;
  area_hectares: number;
  area_acres: number;
  crop_type: string;
  planting_date: string | null;
  soil_type: string;
  irrigation_method: string;
  notes: string;
  photo_url: string;
  is_demo: boolean;
}

export interface IrrigationPoint {
  id: string;
  farm_id: string;
  user_id: string;
  type: string;
  lat: number;
  lng: number;
  notes: string;
  created_at: string;
}

export interface IrrigationPointInput {
  farm_id: string;
  type: string;
  lat: number;
  lng: number;
  notes: string;
}

export interface FarmActivity {
  id: string;
  farm_id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
}

export interface FarmWithDetails extends Farm {
  irrigation_points?: IrrigationPoint[];
  activity?: FarmActivity[];
}

export const CROP_TYPES: CropType[] = [
  'Corn', 'Wheat', 'Soybeans', 'Rice', 'Cotton', 'Alfalfa',
  'Tomatoes', 'Potatoes', 'Grapes', 'Almonds', 'Sunflower', 'Barley', 'Other',
];

export const SOIL_TYPES: SoilType[] = [
  'Clay', 'Sandy', 'Loam', 'Silty Loam', 'Peat', 'Chalky', 'Saline', 'Unknown',
];

export const IRRIGATION_METHODS: IrrigationMethod[] = [
  'Drip', 'Sprinkler', 'Center Pivot', 'Flood', 'Furrow', 'Dryland', 'Subsurface', 'None',
];

export const IRRIGATION_POINT_TYPES: IrrigationPointType[] = [
  'Drip Valve', 'Sprinkler Head', 'Center Pivot', 'Canal Intake',
  'Water Source', 'Pump Station', 'Reservoir',
];

export const CROP_COLORS: Record<string, string> = {
  Corn: '#D9A83E',
  Wheat: '#C7A94E',
  Soybeans: '#86A96B',
  Rice: '#8BB873',
  Cotton: '#CFC9A8',
  Alfalfa: '#578048',
  Tomatoes: '#C86145',
  Potatoes: '#BA9366',
  Grapes: '#82627F',
  Almonds: '#D99487',
  Sunflower: '#EAC45A',
  Barley: '#BB8A4C',
  Other: '#8F9684',
};

export const IRRIGATION_POINT_COLORS: Record<string, string> = {
  'Drip Valve': '#82A96F',
  'Sprinkler Head': '#6C9E78',
  'Center Pivot': '#D9A83E',
  'Canal Intake': '#7BB4B2',
  'Water Source': '#6297A4',
  'Pump Station': '#B36A4C',
  'Reservoir': '#8273A8',
};
