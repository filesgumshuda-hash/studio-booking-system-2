import React, { useEffect, useState } from 'react';
import { Camera, Video } from 'lucide-react';
import { ProgressBar } from '../common/ProgressBar';
import { supabase } from '../../lib/supabase';

interface DataCollectionData {
  id: string;
  staff_id: string;
  still_photos_target: number;
  still_photos_collected: number;
  videos_target: number;
  videos_collected: number;
}

interface StaffWithCollection {
  id: string;
  name: string;
  role: string;
  collection?: DataCollectionData;
}

interface DataCollectionProgressProps {
  eventId: string;
  assignedStaff: StaffWithCollection[];
}

export function DataCollectionProgress({ eventId, assignedStaff }: DataCollectionProgressProps) {
  const [collectionData, setCollectionData] = useState<DataCollectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollectionData();
  }, [eventId]);

  const loadCollectionData = async () => {
    try {
      const { data, error } = await supabase
        .from('event_data_collection')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;
      setCollectionData(data || []);
    } catch (error) {
      console.error('Error loading collection data:', error);
    } finally {
      setLoading(false);
    }
  };

  const photographersAndVideographers = assignedStaff.filter(
    (staff) => staff.role === 'photographer' || staff.role === 'videographer'
  );

  if (photographersAndVideographers.length === 0) {
    return null;
  }

  const calculatePercentage = (collected: number, target: number): number => {
    if (target === 0) return 0;
    return Math.round((collected / target) * 100);
  };

  const calculateOverallProgress = (): number => {
    let totalTarget = 0;
    let totalCollected = 0;

    photographersAndVideographers.forEach((staff) => {
      const collection = collectionData.find((c) => c.staff_id === staff.id);
      if (collection) {
        totalTarget += collection.still_photos_target + collection.videos_target;
        totalCollected += collection.still_photos_collected + collection.videos_collected;
      }
    });

    return calculatePercentage(totalCollected, totalTarget);
  };

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Loading data collection progress...</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Data Collection Progress:</h4>

      {photographersAndVideographers.map((staff) => {
        const collection = collectionData.find((c) => c.staff_id === staff.id);
        const stillPhotosPercentage = collection
          ? calculatePercentage(collection.still_photos_collected, collection.still_photos_target)
          : 0;
        const videosPercentage = collection
          ? calculatePercentage(collection.videos_collected, collection.videos_target)
          : 0;

        const icon = staff.role === 'photographer' ? <Camera size={14} /> : <Video size={14} />;

        return (
          <div key={staff.id} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <p className="text-sm font-medium text-gray-800">{staff.name}</p>
            </div>

            <ProgressBar
              label="Still Photos"
              percentage={stillPhotosPercentage}
              current={collection?.still_photos_collected || 0}
              target={collection?.still_photos_target || 0}
            />

            <ProgressBar
              label="Videos"
              percentage={videosPercentage}
              current={collection?.videos_collected || 0}
              target={collection?.videos_target || 0}
            />
          </div>
        );
      })}

      {photographersAndVideographers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <ProgressBar label="Overall Data Collection" percentage={calculateOverallProgress()} />
        </div>
      )}
    </div>
  );
}
