import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../shared/logger/index.js';
import { Property } from '../modules/property/property.model.js';
import { propertyLocationService } from '../shared/services/index.js';

interface ScriptConfig {
  dryRun: boolean;
  limit?: number;
}

function parseArgs(): ScriptConfig {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));

  return {
    dryRun: args.includes('--dry-run'),
    limit: limitArg ? Number(limitArg.split('=')[1]) : undefined,
  };
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs();

  await connectDatabase();

  try {
    const query = {
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
        { location_precision: { $exists: false } },
      ],
    };

    let propertyQuery = Property.find(query)
      .select('_id external_id city_id canton_id latitude longitude')
      .lean();

    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
      propertyQuery = propertyQuery.limit(limit);
    }

    const properties = await propertyQuery.exec();
    logger.info(`Found ${properties.length} properties to resolve`, { dryRun, limit });

    let updatedCount = 0;

    for (const property of properties) {
      const resolvedLocation = await propertyLocationService.resolve({
        latitude: property.latitude,
        longitude: property.longitude,
        cityId:
          property.city_id instanceof mongoose.Types.ObjectId
            ? property.city_id.toString()
            : String(property.city_id),
        cantonId:
          property.canton_id instanceof mongoose.Types.ObjectId
            ? property.canton_id.toString()
            : String(property.canton_id),
      });

      logger.info(`Resolved property ${property.external_id}`, {
        location_precision: resolvedLocation.location_precision,
        geocoding_source: resolvedLocation.geocoding_source,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
      });

      if (!dryRun) {
        await Property.updateOne(
          { _id: property._id },
          {
            $set: {
              latitude: resolvedLocation.latitude,
              longitude: resolvedLocation.longitude,
              location_precision: resolvedLocation.location_precision,
              geocoding_source: resolvedLocation.geocoding_source,
              geocoded_at: resolvedLocation.geocoded_at,
            },
          }
        );
      }

      updatedCount += 1;
    }

    logger.info(`Backfill complete`, { updatedCount, dryRun });
  } finally {
    await disconnectDatabase();
  }
}

main().catch(async (error) => {
  logger.error('Backfill property coordinates failed', error);
  await disconnectDatabase();
  process.exit(1);
});