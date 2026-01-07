interface WeatherData {
    date: string;
    temperature: number;
    precipitation: number;
}

export const fetchWeatherData = async (startDate: string, endDate: string): Promise<Record<string, WeatherData>> => {
    try {
        // Bergamo Coordinates
        const lat = 45.6983;
        const lon = 9.6773;

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum&timezone=Europe%2FBerlin`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.daily) {
            throw new Error("No weather data found");
        }

        const weatherMap: Record<string, WeatherData> = {};

        data.daily.time.forEach((date: string, index: number) => {
            weatherMap[date] = {
                date,
                temperature: data.daily.temperature_2m_mean[index],
                precipitation: data.daily.precipitation_sum[index]
            };
        });

        return weatherMap;

    } catch (error) {
        console.error("Error fetching weather data:", error);
        return {};
    }
};
