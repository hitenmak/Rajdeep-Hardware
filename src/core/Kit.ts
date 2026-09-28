import axios from 'axios';
import moment from 'moment';

// Helpers
import { log, logInfo, logWarn, logError, logSuccess, empty, getNum, getBool, getError, getStr } from '../utils';

// Others
import Config from '../config';
import ApiEndpoint from '../config/ApiEndpoint';

//--------------------------------------------------------------

export default class Kit {

    static async getCurrencyRate(currency: string = 'USD'): Promise<any> {
        try {
            const response = await fetch(`${ApiEndpoint.WEB_APP.CURRENCY_RATE_URL}/${currency}`);
            const data = await response.json();

            let resData = {
                base: data?.base,
                date: data?.date,
                time_last_updated: data?.time_last_updated,
                rates: data.rates
            };

            return resData;
        } catch (e: any) {
            return { error: getError(e) };
        }
    }

    // map api {
    static async getLatLong(location: any): Promise<any> {
        try {
            let error = '';

            let addressData = `${location?.address1 ? location.address1 + ', ' : ''}${location?.address2 ? location.address2 + ', ' : ''}${location?.city ? location.city + ', ' : ''}${location?.state ? location?.state + ', ' : ''}${location?.country ? location?.country + ', ' : ''}${location?.postcode ? location.postcode + ', ' : ''}`;
            let latitude = null;
            let longitude = null;

            /*// map box api {
            const mapBoxResponse = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressData)}.json?access_token=${Config.MAP_BOX_ACCESS_TOKEN}`);
            const mapBoxData = await mapBoxResponse.json();
            // d(mapBoxData, `Map Bix Lat Long API`);

            if (mapBoxData?.features && mapBoxData?.features?.length > 0) {
                const [long, lat] = mapBoxData?.features[0]?.center;
                latitude = lat;
                longitude = long;
            } else {
                error = 'No results found';
            }
            // } map box api*/

            // google api {
            const googleResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressData)}&fields=geometry&key=${Config.GOOGLE.MAP_API_KEY}`);
            const googleData = await googleResponse.json();
            // d(googleData, `Googl Lat Long API`);

            if (googleData?.results && googleData?.results?.length > 0) {
                latitude = googleData?.results[0]?.geometry?.location.lat;
                longitude = googleData?.results[0]?.geometry?.location.lng;
            } else {
                error = 'No results found';
            }
            // } google api

            let resData = {
                error,
                location: {
                    address1: getStr(location?.address1 || ''),
                    address2: getStr(location?.address2 || ''),
                    city: getStr(location?.city || ''),
                    state: getStr(location?.state || ''),
                    country: getStr(location?.country || ''),
                    postcode: getStr(location?.postcode || ''),
                },
                latitude: getStr(latitude),
                longitude: getStr(longitude),
            }
            return resData;
        } catch (e: any) {
            return { error: getError(e) };
        }
    }

    static async getDistance(fromLocation: any, toLocation: any = {}): Promise<any> {
        try {
            let error = '';

            let fromLocationLatitude = fromLocation?.latitude || null;
            let fromLocationLongitude = fromLocation?.longitude || null;
            if (empty(fromLocationLatitude) && empty(fromLocationLongitude)) {
                let fromAddressData = await Kit.getLatLong(fromLocation);
                if (fromAddressData?.error) error = fromAddressData.error;

                fromLocationLatitude = fromAddressData?.latitude;
                fromLocationLongitude = fromAddressData?.longitude;
            }

            let toLocationLatitude = null;
            let toLocationLongitude = null;
            if (!empty(toLocation)) {
                toLocationLatitude = toLocation?.latitude;
                toLocationLongitude = toLocation?.longitude;
                if (empty(toLocationLatitude) && empty(toLocationLongitude)) {
                    let toAddressData = await Kit.getLatLong(toLocation);
                    if (toAddressData?.error) error = toAddressData.error;

                    toLocationLatitude = toAddressData?.latitude;
                    toLocationLongitude = toAddressData?.longitude;
                }
            } else { // get current location
                const ipInfoToken = Config.IP_INFO_TOKEN;

                const ipInfoRes = await fetch(`https://ipinfo.io?token=${ipInfoToken}`);
                const ipInfo = await ipInfoRes.json();

                const [lat, lng] = ipInfo.loc.split(',');
                if (!empty(lat) && !empty(lng)) {
                    toLocationLatitude = lng;
                    toLocationLongitude = lat;
                }
            }

            let distance: any = { label: '', meter: '', km: '' }; // static value

            // map box api {
            const mapBoxDistanceResponse = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${fromLocationLongitude},${fromLocationLatitude};${toLocationLongitude},${toLocationLatitude}?access_token=${Config.MAP_BOX_ACCESS_TOKEN}&overview=false`);
            const mapBoxDistance = await mapBoxDistanceResponse.json();
            // d(mapBoxDistance, `Map Box Distance Data`);

            if (!empty(mapBoxDistance?.routes) && mapBoxDistance?.routes?.length > 0) {
                const distanceMeters = mapBoxDistance?.routes[0]?.distance || 0;
                const distanceKm = (distanceMeters / 1000).toFixed(2);

                distance = {
                    label: `${distanceKm} km`,
                    meter: getNum(distanceMeters),
                    km: getNum(distanceKm)
                };
            } else {
                error = mapBoxDistance?.message || 'Unable to calculate distance';
            }
            // } map box api

            /*// google api {
            const googleDistanceResponse = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLocationLatitude},${fromLocationLongitude}&destinations=${toLocationLatitude},${toLocationLongitude}&mode=driving&key=${Config.GOOGLE.MAP_API_KEY}`);
            const googleDistanceData = await googleDistanceResponse.json();
            // d(googleDistanceData, `Google Distance Data`);

            if (!empty(googleDistanceData?.rows) && googleDistanceData?.rows?.length > 0) {
                const distanceMeters = googleDistanceData?.rows[0]?.elements[0]?.distance?.value || 0;
                const distanceKm = (distanceMeters / 1000).toFixed(2);

                distance = {
                    label: `${distanceKm} km`,
                    meter: getNum(distanceMeters),
                    km: getNum(distanceKm)
                };
            } else {
                error = googleDistanceData?.message || 'Unable to calculate distance';
            }
            // } google api*/

            let resData = {
                error,
                fromLocation: {
                    fromLocationLatitude: getStr(fromLocationLatitude),
                    fromLocationLongitude: getStr(fromLocationLongitude),
                },
                toLocation: {
                    toLocationLatitude: getStr(toLocationLatitude),
                    toLocationLongitude: getStr(toLocationLongitude),
                },
                distance
            }
            return resData;
        } catch (e: any) {
            return { error: getError(e) };
        }
    }
    // } map api

    static async compareIosVersions(currentVersion: string, latestVersion: string): Promise<any> {
        const currentV = currentVersion.split('.').map(Number);
        const latestV = latestVersion.split('.').map(Number);

        for (let i = 0; i < Math.max(currentV.length, latestV.length); i++) {
            const diff = (currentV[i] || 0) - (latestV[i] || 0);
            if (diff !== 0) return diff;
        }
        return 0;
    }

}