export interface WeatherData {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
}

export const fetchWeatherData = async (startDate: string, endDate: string): Promise<Record<string, WeatherData>> => {
    try {
        // Bergamo Coordinates
        const lat = 45.6983;
        const lon = 9.6773;

        const today = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        // If start date is in the future, return empty
        if (start > today) {
            return {};
        }

        // Clamp end date to today if it's in the future
        let finalEndDate = endDate;
        if (end > today) {
            finalEndDate = today.toISOString().split('T')[0];
        }

        // If clamped end date is before start date (shouldn't happen given check above, but for safety), return empty
        if (new Date(finalEndDate) < start) {
            return {};
        }

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${finalEndDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FBerlin`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.warn("Weather API returned error (likely future date):", data.reason);
            return {};
        }

        if (!data.daily) {
            // Silently return empty if no data found (common for very recent dates not yet in archive)
            return {};
        }

        const weatherMap: Record<string, WeatherData> = {};

        data.daily.time.forEach((date: string, index: number) => {
            weatherMap[date] = {
                date,
                tempMax: data.daily.temperature_2m_max[index],
                tempMin: data.daily.temperature_2m_min[index],
                precipitation: data.daily.precipitation_sum[index]
            };
        });

        return weatherMap;

    } catch (error) {
        console.warn("Error fetching weather data:", error);
        return {};
    }
};
