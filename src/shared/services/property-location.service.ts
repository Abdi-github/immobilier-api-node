import mongoose from 'mongoose';

import { City } from '../../modules/location/city.model.js';
import { Canton } from '../../modules/location/canton.model.js';
import {
  PropertyGeocodingSource,
  PropertyLocationPrecision,
} from '../../modules/property/property.model.js';

const CANTON_CENTROIDS: Record<string, { latitude: number; longitude: number }> = {
  AG: { latitude: 47.3904, longitude: 8.0457 },
  AI: { latitude: 47.3314, longitude: 9.4096 },
  AR: { latitude: 47.3860, longitude: 9.2790 },
  BE: { latitude: 46.7986, longitude: 7.7081 },
  BL: { latitude: 47.4418, longitude: 7.7644 },
  BS: { latitude: 47.5596, longitude: 7.5886 },
  FR: { latitude: 46.6817, longitude: 7.1173 },
  GE: { latitude: 46.2080, longitude: 6.1423 },
  GL: { latitude: 47.0411, longitude: 9.0679 },
  GR: { latitude: 46.6569, longitude: 9.5780 },
  JU: { latitude: 47.3444, longitude: 7.1431 },
  LU: { latitude: 47.0502, longitude: 8.3093 },
  NE: { latitude: 46.9951, longitude: 6.7802 },
  NW: { latitude: 46.9422, longitude: 8.4014 },
  OW: { latitude: 46.8779, longitude: 8.2512 },
  SG: { latitude: 47.1449, longitude: 9.3504 },
  SH: { latitude: 47.7009, longitude: 8.6359 },
  SO: { latitude: 47.3321, longitude: 7.6389 },
  SZ: { latitude: 47.0207, longitude: 8.6526 },
  TG: { latitude: 47.6038, longitude: 9.1084 },
  TI: { latitude: 46.3317, longitude: 8.8005 },
  UR: { latitude: 46.7721, longitude: 8.6040 },
  VD: { latitude: 46.5613, longitude: 6.5368 },
  VS: { latitude: 46.1905, longitude: 7.5448 },
  ZG: { latitude: 47.1662, longitude: 8.5155 },
  ZH: { latitude: 47.4174, longitude: 8.6551 },
};

export interface PropertyLocationResolutionInput {
  latitude?: number;
  longitude?: number;
  cityId?: string;
  cantonId?: string;
}

export interface ResolvedPropertyLocation {
  latitude?: number;
  longitude?: number;
  location_precision: PropertyLocationPrecision;
  geocoding_source?: PropertyGeocodingSource;
  geocoded_at?: Date;
}

export class PropertyLocationService {
  async resolve(input: PropertyLocationResolutionInput): Promise<ResolvedPropertyLocation> {
    const hasExactCoordinates =
      typeof input.latitude === 'number' && typeof input.longitude === 'number';

    if (hasExactCoordinates) {
      return {
        latitude: input.latitude,
        longitude: input.longitude,
        location_precision: 'exact',
        geocoding_source: 'manual',
        geocoded_at: new Date(),
      };
    }

    if (input.cityId && mongoose.Types.ObjectId.isValid(input.cityId)) {
      const city = await City.findById(input.cityId).select('latitude longitude').lean();
      if (typeof city?.latitude === 'number' && typeof city?.longitude === 'number') {
        return {
          latitude: city.latitude,
          longitude: city.longitude,
          location_precision: 'city',
          geocoding_source: 'city_centroid',
          geocoded_at: new Date(),
        };
      }
    }

    if (input.cantonId && mongoose.Types.ObjectId.isValid(input.cantonId)) {
      const canton = await Canton.findById(input.cantonId).select('code latitude longitude').lean();
      if (typeof canton?.latitude === 'number' && typeof canton?.longitude === 'number') {
        return {
          latitude: canton.latitude,
          longitude: canton.longitude,
          location_precision: 'canton',
          geocoding_source: 'canton_centroid',
          geocoded_at: new Date(),
        };
      }

      const centroid = canton?.code ? CANTON_CENTROIDS[canton.code] : undefined;
      if (centroid) {
        return {
          latitude: centroid.latitude,
          longitude: centroid.longitude,
          location_precision: 'canton',
          geocoding_source: 'canton_centroid',
          geocoded_at: new Date(),
        };
      }
    }

    return {
      latitude: undefined,
      longitude: undefined,
      location_precision: 'unknown',
      geocoding_source: undefined,
      geocoded_at: undefined,
    };
  }
}

export const propertyLocationService = new PropertyLocationService();