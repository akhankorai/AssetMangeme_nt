import { useState } from 'react';

export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [regularInspectionList, setRegularInspectionList] = useState([]);

  return {
    assets, setAssets,
    categories, setCategories,
    items, setItems,
    serviceTypes, setServiceTypes,
    locations, setLocations,
    regularInspectionList, setRegularInspectionList
  };
}
