/**
 * Script to generate property_images.json with Cloudinary URLs
 *
 * This script:
 * 1. Loads all properties and their categories
 * 2. Maps categories to Cloudinary placeholder folders
 * 3. Randomly assigns Cloudinary images to each property
 * 4. Outputs a new property_images.json file
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface Property {
  _id: string;
  external_id: string;
  category_id: string;
  [key: string]: unknown;
}

interface Category {
  _id: string;
  slug: string;
  section: string;
}

interface CloudinaryImage {
  publicId: string;
  secureUrl: string;
  assetFolder: string;
  filename: string;
}

interface PropertyImage {
  _id: string;
  property_id: string;
  url: string;
  alt_text: string;
  is_primary: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

// Cloudinary placeholder images - organized by category
// Data extracted from Cloudinary search API
const CLOUDINARY_PLACEHOLDERS: Record<string, CloudinaryImage[]> = {
  apartment: [
    // property-1
    { publicId: 'immobilier_node/placeholders/apartment/property-1/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624109/immobilier_node/placeholders/apartment/property-1/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-1', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-1/29630085', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624106/immobilier_node/placeholders/apartment/property-1/29630085.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-1', filename: '29630085' },
    { publicId: 'immobilier_node/placeholders/apartment/property-1/29630084', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624104/immobilier_node/placeholders/apartment/property-1/29630084.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-1', filename: '29630084' },
    { publicId: 'immobilier_node/placeholders/apartment/property-1/29630082', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624101/immobilier_node/placeholders/apartment/property-1/29630082.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-1', filename: '29630082' },
    { publicId: 'immobilier_node/placeholders/apartment/property-1/29630079', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624099/immobilier_node/placeholders/apartment/property-1/29630079.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-1', filename: '29630079' },
    // property-2
    { publicId: 'immobilier_node/placeholders/apartment/property-2/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624135/immobilier_node/placeholders/apartment/property-2/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-2', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-2/30396620', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624133/immobilier_node/placeholders/apartment/property-2/30396620.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-2', filename: '30396620' },
    { publicId: 'immobilier_node/placeholders/apartment/property-2/30396594', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624133/immobilier_node/placeholders/apartment/property-2/30396594.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-2', filename: '30396594' },
    { publicId: 'immobilier_node/placeholders/apartment/property-2/30396592', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624131/immobilier_node/placeholders/apartment/property-2/30396592.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-2', filename: '30396592' },
    { publicId: 'immobilier_node/placeholders/apartment/property-2/30396591', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624130/immobilier_node/placeholders/apartment/property-2/30396591.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-2', filename: '30396591' },
    // property-3
    { publicId: 'immobilier_node/placeholders/apartment/property-3/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624141/immobilier_node/placeholders/apartment/property-3/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-3', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-3/30423464', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624138/immobilier_node/placeholders/apartment/property-3/30423464.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-3', filename: '30423464' },
    { publicId: 'immobilier_node/placeholders/apartment/property-3/30423460', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624137/immobilier_node/placeholders/apartment/property-3/30423460.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-3', filename: '30423460' },
    // property-4
    { publicId: 'immobilier_node/placeholders/apartment/property-4/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624149/immobilier_node/placeholders/apartment/property-4/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-4', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-4/30389643', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624146/immobilier_node/placeholders/apartment/property-4/30389643.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-4', filename: '30389643' },
    { publicId: 'immobilier_node/placeholders/apartment/property-4/30389638', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624145/immobilier_node/placeholders/apartment/property-4/30389638.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-4', filename: '30389638' },
    { publicId: 'immobilier_node/placeholders/apartment/property-4/30389636', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624144/immobilier_node/placeholders/apartment/property-4/30389636.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-4', filename: '30389636' },
    { publicId: 'immobilier_node/placeholders/apartment/property-4/30389631', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624142/immobilier_node/placeholders/apartment/property-4/30389631.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-4', filename: '30389631' },
    // property-5
    { publicId: 'immobilier_node/placeholders/apartment/property-5/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624155/immobilier_node/placeholders/apartment/property-5/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-5', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-5/30405914', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624153/immobilier_node/placeholders/apartment/property-5/30405914.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-5', filename: '30405914' },
    { publicId: 'immobilier_node/placeholders/apartment/property-5/30405911', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624153/immobilier_node/placeholders/apartment/property-5/30405911.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-5', filename: '30405911' },
    { publicId: 'immobilier_node/placeholders/apartment/property-5/30405910', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624152/immobilier_node/placeholders/apartment/property-5/30405910.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-5', filename: '30405910' },
    { publicId: 'immobilier_node/placeholders/apartment/property-5/30405909', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624151/immobilier_node/placeholders/apartment/property-5/30405909.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-5', filename: '30405909' },
    { publicId: 'immobilier_node/placeholders/apartment/property-5/30405906', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624150/immobilier_node/placeholders/apartment/property-5/30405906.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-5', filename: '30405906' },
    // property-6
    { publicId: 'immobilier_node/placeholders/apartment/property-6/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624161/immobilier_node/placeholders/apartment/property-6/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-6', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-6/29180305', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624159/immobilier_node/placeholders/apartment/property-6/29180305.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-6', filename: '29180305' },
    { publicId: 'immobilier_node/placeholders/apartment/property-6/29180303', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624158/immobilier_node/placeholders/apartment/property-6/29180303.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-6', filename: '29180303' },
    { publicId: 'immobilier_node/placeholders/apartment/property-6/29180299', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624157/immobilier_node/placeholders/apartment/property-6/29180299.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-6', filename: '29180299' },
    { publicId: 'immobilier_node/placeholders/apartment/property-6/29180298', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624156/immobilier_node/placeholders/apartment/property-6/29180298.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-6', filename: '29180298' },
    // property-7
    { publicId: 'immobilier_node/placeholders/apartment/property-7/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624168/immobilier_node/placeholders/apartment/property-7/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-7', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-7/29180164', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624166/immobilier_node/placeholders/apartment/property-7/29180164.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-7', filename: '29180164' },
    { publicId: 'immobilier_node/placeholders/apartment/property-7/29180163', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624165/immobilier_node/placeholders/apartment/property-7/29180163.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-7', filename: '29180163' },
    { publicId: 'immobilier_node/placeholders/apartment/property-7/29180162', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624164/immobilier_node/placeholders/apartment/property-7/29180162.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-7', filename: '29180162' },
    { publicId: 'immobilier_node/placeholders/apartment/property-7/29180158', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624162/immobilier_node/placeholders/apartment/property-7/29180158.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-7', filename: '29180158' },
    // property-8
    { publicId: 'immobilier_node/placeholders/apartment/property-8/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624174/immobilier_node/placeholders/apartment/property-8/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-8', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-8/30398401', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624172/immobilier_node/placeholders/apartment/property-8/30398401.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-8', filename: '30398401' },
    { publicId: 'immobilier_node/placeholders/apartment/property-8/30398399', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624170/immobilier_node/placeholders/apartment/property-8/30398399.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-8', filename: '30398399' },
    { publicId: 'immobilier_node/placeholders/apartment/property-8/30398398', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624169/immobilier_node/placeholders/apartment/property-8/30398398.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-8', filename: '30398398' },
    // property-9
    { publicId: 'immobilier_node/placeholders/apartment/property-9/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624180/immobilier_node/placeholders/apartment/property-9/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-9', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-9/29147515', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624178/immobilier_node/placeholders/apartment/property-9/29147515.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-9', filename: '29147515' },
    { publicId: 'immobilier_node/placeholders/apartment/property-9/29147514', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624176/immobilier_node/placeholders/apartment/property-9/29147514.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-9', filename: '29147514' },
    { publicId: 'immobilier_node/placeholders/apartment/property-9/29147513', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624175/immobilier_node/placeholders/apartment/property-9/29147513.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-9', filename: '29147513' },
    // property-10
    { publicId: 'immobilier_node/placeholders/apartment/property-10/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624115/immobilier_node/placeholders/apartment/property-10/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-10', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-10/30131895', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624112/immobilier_node/placeholders/apartment/property-10/30131895.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-10', filename: '30131895' },
    { publicId: 'immobilier_node/placeholders/apartment/property-10/30131892', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624112/immobilier_node/placeholders/apartment/property-10/30131892.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-10', filename: '30131892' },
    { publicId: 'immobilier_node/placeholders/apartment/property-10/30131890', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624111/immobilier_node/placeholders/apartment/property-10/30131890.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-10', filename: '30131890' },
    { publicId: 'immobilier_node/placeholders/apartment/property-10/30131889', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624110/immobilier_node/placeholders/apartment/property-10/30131889.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-10', filename: '30131889' },
    // property-11
    { publicId: 'immobilier_node/placeholders/apartment/property-11/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624123/immobilier_node/placeholders/apartment/property-11/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-11', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-11/30333032', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624120/immobilier_node/placeholders/apartment/property-11/30333032.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-11', filename: '30333032' },
    { publicId: 'immobilier_node/placeholders/apartment/property-11/30333030', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624119/immobilier_node/placeholders/apartment/property-11/30333030.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-11', filename: '30333030' },
    { publicId: 'immobilier_node/placeholders/apartment/property-11/30333027', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624117/immobilier_node/placeholders/apartment/property-11/30333027.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-11', filename: '30333027' },
    { publicId: 'immobilier_node/placeholders/apartment/property-11/30333025', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624116/immobilier_node/placeholders/apartment/property-11/30333025.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-11', filename: '30333025' },
    // property-12
    { publicId: 'immobilier_node/placeholders/apartment/property-12/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624128/immobilier_node/placeholders/apartment/property-12/main.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-12', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/apartment/property-12/30364310', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624127/immobilier_node/placeholders/apartment/property-12/30364310.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-12', filename: '30364310' },
    { publicId: 'immobilier_node/placeholders/apartment/property-12/30364307', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624126/immobilier_node/placeholders/apartment/property-12/30364307.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-12', filename: '30364307' },
    { publicId: 'immobilier_node/placeholders/apartment/property-12/30364306', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624125/immobilier_node/placeholders/apartment/property-12/30364306.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-12', filename: '30364306' },
    { publicId: 'immobilier_node/placeholders/apartment/property-12/30364305', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624124/immobilier_node/placeholders/apartment/property-12/30364305.webp', assetFolder: 'immobilier_node/placeholders/apartment/property-12', filename: '30364305' },
  ],
  house: [
    // property-1
    { publicId: 'immobilier_node/placeholders/house/property-1/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624187/immobilier_node/placeholders/house/property-1/main.webp', assetFolder: 'immobilier_node/placeholders/house/property-1', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/house/property-1/30284865', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624185/immobilier_node/placeholders/house/property-1/30284865.webp', assetFolder: 'immobilier_node/placeholders/house/property-1', filename: '30284865' },
    { publicId: 'immobilier_node/placeholders/house/property-1/30284863', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624183/immobilier_node/placeholders/house/property-1/30284863.webp', assetFolder: 'immobilier_node/placeholders/house/property-1', filename: '30284863' },
    { publicId: 'immobilier_node/placeholders/house/property-1/30284862', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624182/immobilier_node/placeholders/house/property-1/30284862.webp', assetFolder: 'immobilier_node/placeholders/house/property-1', filename: '30284862' },
    // property-2
    { publicId: 'immobilier_node/placeholders/house/property-2/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624194/immobilier_node/placeholders/house/property-2/main.webp', assetFolder: 'immobilier_node/placeholders/house/property-2', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/house/property-2/30334358', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624192/immobilier_node/placeholders/house/property-2/30334358.webp', assetFolder: 'immobilier_node/placeholders/house/property-2', filename: '30334358' },
    { publicId: 'immobilier_node/placeholders/house/property-2/30334357', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624191/immobilier_node/placeholders/house/property-2/30334357.webp', assetFolder: 'immobilier_node/placeholders/house/property-2', filename: '30334357' },
    { publicId: 'immobilier_node/placeholders/house/property-2/30334348', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624189/immobilier_node/placeholders/house/property-2/30334348.webp', assetFolder: 'immobilier_node/placeholders/house/property-2', filename: '30334348' },
    { publicId: 'immobilier_node/placeholders/house/property-2/30334347', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624188/immobilier_node/placeholders/house/property-2/30334347.webp', assetFolder: 'immobilier_node/placeholders/house/property-2', filename: '30334347' },
    // property-3
    { publicId: 'immobilier_node/placeholders/house/property-3/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624201/immobilier_node/placeholders/house/property-3/main.webp', assetFolder: 'immobilier_node/placeholders/house/property-3', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/house/property-3/30419635', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624199/immobilier_node/placeholders/house/property-3/30419635.webp', assetFolder: 'immobilier_node/placeholders/house/property-3', filename: '30419635' },
    { publicId: 'immobilier_node/placeholders/house/property-3/30419633', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624199/immobilier_node/placeholders/house/property-3/30419633.webp', assetFolder: 'immobilier_node/placeholders/house/property-3', filename: '30419633' },
    { publicId: 'immobilier_node/placeholders/house/property-3/30419630', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624198/immobilier_node/placeholders/house/property-3/30419630.webp', assetFolder: 'immobilier_node/placeholders/house/property-3', filename: '30419630' },
    { publicId: 'immobilier_node/placeholders/house/property-3/30419625', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624197/immobilier_node/placeholders/house/property-3/30419625.webp', assetFolder: 'immobilier_node/placeholders/house/property-3', filename: '30419625' },
    { publicId: 'immobilier_node/placeholders/house/property-3/30419622', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624195/immobilier_node/placeholders/house/property-3/30419622.webp', assetFolder: 'immobilier_node/placeholders/house/property-3', filename: '30419622' },
    // property-4
    { publicId: 'immobilier_node/placeholders/house/property-4/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624207/immobilier_node/placeholders/house/property-4/main.webp', assetFolder: 'immobilier_node/placeholders/house/property-4', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/house/property-4/30421965', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624205/immobilier_node/placeholders/house/property-4/30421965.webp', assetFolder: 'immobilier_node/placeholders/house/property-4', filename: '30421965' },
    { publicId: 'immobilier_node/placeholders/house/property-4/30421964', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624204/immobilier_node/placeholders/house/property-4/30421964.webp', assetFolder: 'immobilier_node/placeholders/house/property-4', filename: '30421964' },
    { publicId: 'immobilier_node/placeholders/house/property-4/30421961', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624202/immobilier_node/placeholders/house/property-4/30421961.webp', assetFolder: 'immobilier_node/placeholders/house/property-4', filename: '30421961' },
    { publicId: 'immobilier_node/placeholders/house/property-4/30421960', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624202/immobilier_node/placeholders/house/property-4/30421960.webp', assetFolder: 'immobilier_node/placeholders/house/property-4', filename: '30421960' },
    // property-5
    { publicId: 'immobilier_node/placeholders/house/property-5/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624215/immobilier_node/placeholders/house/property-5/main.webp', assetFolder: 'immobilier_node/placeholders/house/property-5', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/house/property-5/30271472', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624214/immobilier_node/placeholders/house/property-5/30271472.webp', assetFolder: 'immobilier_node/placeholders/house/property-5', filename: '30271472' },
    { publicId: 'immobilier_node/placeholders/house/property-5/30271469', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624212/immobilier_node/placeholders/house/property-5/30271469.webp', assetFolder: 'immobilier_node/placeholders/house/property-5', filename: '30271469' },
    { publicId: 'immobilier_node/placeholders/house/property-5/30271468', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624210/immobilier_node/placeholders/house/property-5/30271468.webp', assetFolder: 'immobilier_node/placeholders/house/property-5', filename: '30271468' },
    { publicId: 'immobilier_node/placeholders/house/property-5/30271466', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624209/immobilier_node/placeholders/house/property-5/30271466.webp', assetFolder: 'immobilier_node/placeholders/house/property-5', filename: '30271466' },
    { publicId: 'immobilier_node/placeholders/house/property-5/30271465', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624208/immobilier_node/placeholders/house/property-5/30271465.webp', assetFolder: 'immobilier_node/placeholders/house/property-5', filename: '30271465' },
    // property-6
    { publicId: 'immobilier_node/placeholders/house/property-6/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624223/immobilier_node/placeholders/house/property-6/main.webp', assetFolder: 'immobilier_node/placeholders/house/property-6', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/house/property-6/30103099', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624222/immobilier_node/placeholders/house/property-6/30103099.webp', assetFolder: 'immobilier_node/placeholders/house/property-6', filename: '30103099' },
    { publicId: 'immobilier_node/placeholders/house/property-6/30103098', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624220/immobilier_node/placeholders/house/property-6/30103098.webp', assetFolder: 'immobilier_node/placeholders/house/property-6', filename: '30103098' },
    { publicId: 'immobilier_node/placeholders/house/property-6/30103097', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624219/immobilier_node/placeholders/house/property-6/30103097.webp', assetFolder: 'immobilier_node/placeholders/house/property-6', filename: '30103097' },
    { publicId: 'immobilier_node/placeholders/house/property-6/30103096', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624218/immobilier_node/placeholders/house/property-6/30103096.webp', assetFolder: 'immobilier_node/placeholders/house/property-6', filename: '30103096' },
    { publicId: 'immobilier_node/placeholders/house/property-6/30103095', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624216/immobilier_node/placeholders/house/property-6/30103095.webp', assetFolder: 'immobilier_node/placeholders/house/property-6', filename: '30103095' },
    // property-7
    { publicId: 'immobilier_node/placeholders/house/property-7/main', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624230/immobilier_node/placeholders/house/property-7/main.webp', assetFolder: 'immobilier_node/placeholders/house/property-7', filename: 'main' },
    { publicId: 'immobilier_node/placeholders/house/property-7/30031516', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624229/immobilier_node/placeholders/house/property-7/30031516.webp', assetFolder: 'immobilier_node/placeholders/house/property-7', filename: '30031516' },
    { publicId: 'immobilier_node/placeholders/house/property-7/30031515', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624228/immobilier_node/placeholders/house/property-7/30031515.webp', assetFolder: 'immobilier_node/placeholders/house/property-7', filename: '30031515' },
    { publicId: 'immobilier_node/placeholders/house/property-7/30031514', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624226/immobilier_node/placeholders/house/property-7/30031514.webp', assetFolder: 'immobilier_node/placeholders/house/property-7', filename: '30031514' },
    { publicId: 'immobilier_node/placeholders/house/property-7/30031512', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624225/immobilier_node/placeholders/house/property-7/30031512.webp', assetFolder: 'immobilier_node/placeholders/house/property-7', filename: '30031512' },
    { publicId: 'immobilier_node/placeholders/house/property-7/30031511', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624224/immobilier_node/placeholders/house/property-7/30031511.webp', assetFolder: 'immobilier_node/placeholders/house/property-7', filename: '30031511' },
  ],
  plot: [
    // property-2 (only plot images available)
    { publicId: 'immobilier_node/placeholders/plot/property-2/29219003', secureUrl: 'https://res.cloudinary.com/dzyyygr1x/image/upload/v1769624232/immobilier_node/placeholders/plot/property-2/29219003.webp', assetFolder: 'immobilier_node/placeholders/plot/property-2', filename: '29219003' },
  ],
};

// Category to placeholder folder mapping
const CATEGORY_TO_PLACEHOLDER: Record<string, string> = {
  apartment: 'apartment',
  house: 'house',
  'furnished-accommodation': 'apartment', // Use apartment images for furnished
  parking: 'apartment', // Use apartment images as fallback (no parking placeholders)
  plot: 'plot',
  office: 'apartment', // Commercial categories use apartment images
  commercial: 'apartment',
  industrial: 'house', // Industrial uses house images
  hotel: 'apartment',
  'commercial-land': 'plot',
};

// Group images by property set (e.g., property-1, property-2, etc.)
function groupImagesByPropertySet(
  images: CloudinaryImage[]
): Map<string, CloudinaryImage[]> {
  const groups = new Map<string, CloudinaryImage[]>();

  for (const img of images) {
    // Extract property-N from assetFolder
    const match = img.assetFolder.match(/property-(\d+)/);
    if (match) {
      const propertySet = `property-${match[1]}`;
      if (!groups.has(propertySet)) {
        groups.set(propertySet, []);
      }
      groups.get(propertySet)!.push(img);
    }
  }

  return groups;
}

// Generate a deterministic but distributed ObjectId
function generateObjectId(seed: string): string {
  // Create a simple hash from the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  // Convert to positive number and create hex string
  const timestamp = Math.abs(hash) % 0xffffffff;
  const random = Math.abs(hash * 31) % 0xffffffffff;

  return (
    timestamp.toString(16).padStart(8, '0') +
    random.toString(16).padStart(10, '0') +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  );
}

// Simple seeded random number generator
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Shuffle array with seed
function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = seededRandom(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

async function main(): Promise<void> {
  console.log('🚀 Starting Cloudinary property images generation...\n');

  // Load data files
  const dataDir = path.join(__dirname, '../../data');

  const properties: Property[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'properties.json'), 'utf-8')
  );
  const categories: Category[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf-8')
  );

  console.log(`📊 Loaded ${properties.length} properties`);
  console.log(`📊 Loaded ${categories.length} categories\n`);

  // Create category map
  const categoryMap = new Map<string, Category>();
  for (const cat of categories) {
    categoryMap.set(cat._id, cat);
  }

  // Group placeholder images by property set for each category
  const placeholdersByCategory = new Map<
    string,
    Map<string, CloudinaryImage[]>
  >();
  for (const [category, images] of Object.entries(CLOUDINARY_PLACEHOLDERS)) {
    placeholdersByCategory.set(category, groupImagesByPropertySet(images));
  }

  // Generate property images
  const propertyImages: PropertyImage[] = [];
  const now = new Date().toISOString();

  let imageCount = 0;
  const categoryStats: Record<string, number> = {};

  for (const property of properties) {
    // Get category slug
    const category = categoryMap.get(property.category_id);
    if (!category) {
      console.warn(`⚠️ Property ${property._id} has invalid category_id`);
      continue;
    }

    // Map category to placeholder folder
    const placeholderCategory =
      CATEGORY_TO_PLACEHOLDER[category.slug] || 'apartment';

    // Track stats
    categoryStats[category.slug] = (categoryStats[category.slug] || 0) + 1;

    // Get placeholder property sets for this category
    const propertySets = placeholdersByCategory.get(placeholderCategory);
    if (!propertySets || propertySets.size === 0) {
      console.warn(
        `⚠️ No placeholder images for category: ${placeholderCategory}`
      );
      continue;
    }

    // Use property ID to deterministically select a property set
    const propertySetKeys = Array.from(propertySets.keys());
    const seed = property._id
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const setIndex = seed % propertySetKeys.length;
    const selectedSetKey = propertySetKeys[setIndex];
    const selectedImages = propertySets.get(selectedSetKey)!;

    // Shuffle images for this property (using property ID as seed)
    const shuffledImages = shuffleArray(selectedImages, seed);

    // Select 3-6 images per property
    const numImages = 3 + (seed % 4); // 3-6 images
    const imagesToUse = shuffledImages.slice(
      0,
      Math.min(numImages, shuffledImages.length)
    );

    // Create property image entries
    for (let i = 0; i < imagesToUse.length; i++) {
      const img = imagesToUse[i];
      const isPrimary = i === 0 || img.filename === 'main';

      // Generate unique ID for this image entry
      const imageId = generateObjectId(`${property._id}-${i}-${img.publicId}`);

      propertyImages.push({
        _id: imageId,
        property_id: property._id,
        url: img.secureUrl,
        alt_text: `Property image ${i + 1}`,
        is_primary: isPrimary && i === 0, // Only first image is primary
        order: i,
        created_at: now,
        updated_at: now,
      });

      imageCount++;
    }
  }

  // Ensure unique IDs
  const idSet = new Set<string>();
  for (const img of propertyImages) {
    if (idSet.has(img._id)) {
      // Regenerate ID if duplicate
      img._id = new ObjectId().toHexString();
    }
    idSet.add(img._id);
  }

  // Write output file
  const outputPath = path.join(dataDir, 'property_images.json');
  fs.writeFileSync(outputPath, JSON.stringify(propertyImages, null, 2));

  console.log('✅ Generation complete!\n');
  console.log(`📊 Statistics:`);
  console.log(`   - Total properties: ${properties.length}`);
  console.log(`   - Total images generated: ${imageCount}`);
  console.log(`   - Average images per property: ${(imageCount / properties.length).toFixed(2)}`);
  console.log(`\n📁 Category distribution:`);
  for (const [cat, count] of Object.entries(categoryStats).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`   - ${cat}: ${count} properties`);
  }
  console.log(`\n💾 Output written to: ${outputPath}`);
}

main().catch(console.error);
