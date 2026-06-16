 const API_KEY = "c40c7160f71e300f282b28f8e2a17ed6"; 
const BASE_URL = "https://api.openweathermap.org/data/2.5/";

let currentUnit = 'C';
let activeWeatherData = null;

document.addEventListener("DOMContentLoaded", () => {
    gsap.to("#app-container", { opacity: 1, duration: 0.8, ease: "power2.out" });
    
    fetchLiveWeatherData("Colombo"); 
    setupInteractionListeners();
});

function setupInteractionListeners() {
    const unitBtn = document.getElementById('unit-toggle-btn');
    const searchInput = document.getElementById('location-input');
    const iconWrap = document.getElementById('weather-icon-wrapper');

    const addLocationBtn = document.getElementById('add-location-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const locationModal = document.getElementById('location-modal');
    const modalInput = document.getElementById('modal-location-input');
    const submitLocationBtn = document.getElementById('submit-location-btn');

    //Intrface
    const openModal = () => {
        locationModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        gsap.to(locationModal, { opacity: 1, duration: 0.3, ease: "power2.out" });
        gsap.fromTo(locationModal.querySelector('div'), { scale: 0.9 }, { scale: 1, duration: 0.3, ease: "back.out(1.5)" });
        setTimeout(() => modalInput.focus(), 100);
    };

    const closeModal = () => {
        gsap.to(locationModal, { opacity: 0, duration: 0.2, ease: "power2.in", onComplete: () => {
            locationModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            modalInput.value = '';
        }});
    };

    const handleModalSubmit = () => {
        const city = modalInput.value.trim();
        if (city !== "") {
            fetchLiveWeatherData(city);
            closeModal();
        } else {
            gsap.to(modalInput, { x: 8, duration: 0.08, yoyo: true, repeat: 3, onComplete: () => modalInput.style.transform = 'none' });
        }
    };

    addLocationBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    submitLocationBtn.addEventListener('click', handleModalSubmit);
    modalInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleModalSubmit(); });

    locationModal.addEventListener('click', (e) => { if (e.target === locationModal) closeModal(); });

    unitBtn.addEventListener('click', () => {
    currentUnit = (currentUnit === 'C') ? 'F' : 'C';
    //c to F change
    unitBtn.innerText = currentUnit === 'C' ? '°F' : '°C'; 
    
    document.getElementById('main-unit').innerText = `°${currentUnit}`;
    renderCalculatedTemperatures();
});

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim() !== "") {
            fetchLiveWeatherData(searchInput.value.trim());
        }
    });

    iconWrap.addEventListener('mousemove', (e) => {
        const dimensions = iconWrap.getBoundingClientRect();
        const pointerX = e.clientX - dimensions.left - (dimensions.width / 2);
        const pointerY = e.clientY - dimensions.top - (dimensions.height / 2);
        gsap.to("#main-weather-icon", { rotationY: pointerX * 0.5, rotationX: -pointerY * 0.5, scale: 1.05, ease: "power1.out", duration: 0.3 });
    });

    iconWrap.addEventListener('mouseleave', () => {
        gsap.to("#main-weather-icon", { rotationY: 0, rotationX: 0, scale: 1, ease: "elastic.out(1, 0.4)", duration: 0.8 });
    });
}
 
async function fetchLiveWeatherData(cityName) {
    const searchInput = document.getElementById('location-input');
    try {
        const weatherResponse = await fetch(`${BASE_URL}weather?q=${cityName}&units=metric&appid=${API_KEY}`);
        if (!weatherResponse.ok) throw new Error("Target destination city not localized");
        const weatherData = await weatherResponse.json();

        const forecastResponse = await fetch(`${BASE_URL}forecast?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&units=metric&appid=${API_KEY}`);
        const forecastData = await forecastResponse.json();

        activeWeatherData = normalizeServerResponse(weatherData, forecastData);
        executeInterfaceTransition(activeWeatherData);
    } catch (err) {
        console.error("API Processing Failure:", err);
        gsap.to(searchInput, { x: 8, duration: 0.08, yoyo: true, repeat: 3, onComplete: () => searchInput.style.transform = 'none' });
    }
}

function normalizeServerResponse(current, forecast) {
    const conditionId = current.weather[0].id;
    let computedBg = "radial-gradient(circle at 50% 30%, #25252e 0%, #0c0c0e 100%)";

    if (conditionId === 800) { 
        computedBg = "radial-gradient(circle at 50% 30%, #1e355e 0%, #090b11 100%)"; 
    } else if (conditionId >= 200 && conditionId < 600) { 
        computedBg = "radial-gradient(circle at 50% 30%, #161c24 0%, #07090d 100%)"; 
    }

    const glyphMapping = {
        Clear: "fa-moon text-indigo-200", 
        Clouds: "fa-cloud-moon text-slate-300",
        Rain: "fa-cloud-moon-rain text-sky-400",
        Thunderstorm: "fa-cloud-bolt text-purple-400",
        Snow: "fa-snowflake text-cyan-200",
        Atmosphere: "fa-smog text-neutral-400"
    };
    const mappedIcon = glyphMapping[current.weather[0].main] || "fa-cloud text-slate-300";

    const timelineData = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < forecast.list.length; i += 10) {
        if (timelineData.length >= 4) break;
        const entry = forecast.list[i];
        const dateObj = new Date(entry.dt * 1000);
        
        timelineData.push({
            day: weekdays[dateObj.getDay()],
            temp: Math.round(entry.main.temp),
            icon: glyphMapping[entry.weather[0].main] || "fa-cloud text-slate-300"
        });
    }

    return {
        name: `${current.name}, ${current.sys.country}`,
        temp: Math.round(current.main.temp), 
        high: Math.round(current.main.temp_max),
        low: Math.round(current.main.temp_min),
        condition: current.weather[0].description,
        icon: mappedIcon,
        bg: computedBg,
        wind: Math.round(current.wind.speed),
        humidity: current.main.humidity,
        uv: Math.round(current.main.feels_like > current.main.temp ? 5 : 2), 
        forecast: timelineData
    };
}

function scaleValue(celsius) {
    return currentUnit === 'F' ? Math.round((celsius * 9/5) + 32) : celsius;
}

function renderCalculatedTemperatures() {
    if (!activeWeatherData) return;
    const tempField = document.getElementById('main-temp');
    const targetTemp = scaleValue(activeWeatherData.temp);
    const currentDisplayedTemp = parseInt(tempField.innerText) || 0;

    gsap.fromTo(tempField, 
        { innerText: currentDisplayedTemp }, 
        { innerText: targetTemp, duration: 0.4, snap: { innerText: 1 }, ease: "power1.out" }
    );

    document.getElementById('temp-bounds').innerHTML = `
        <i class="fa-solid fa-arrow-up text-purple-400/70"></i> H: ${scaleValue(activeWeatherData.high)}° &nbsp;&nbsp; 
        <i class="fa-solid fa-arrow-down text-indigo-400/70"></i> L: ${scaleValue(activeWeatherData.low)}°
    `;

    const forecastCards = document.querySelectorAll('.forecast-item-card');
    forecastCards.forEach((card, index) => {
        const itemData = activeWeatherData.forecast[index];
        if (itemData) {
            card.querySelector('.forecast-item-temp').innerText = `${scaleValue(itemData.temp)}°`;
        }
    });
}

function executeInterfaceTransition(data) {
    document.body.style.background = data.bg;
    const uiTimeline = gsap.timeline();
    
    uiTimeline.to(["#main-weather-icon", "#main-temp", "#weather-condition", "#temp-bounds", "#bento-container", "#forecast-row"], {
        opacity: 0, y: 10, duration: 0.25, stagger: 0.03, ease: "power2.in",
        onComplete: () => {
            document.getElementById('city-name').innerText = data.name;
            document.getElementById('weather-condition').innerText = data.condition;
            document.getElementById('metric-wind').innerHTML = `${data.wind} <span class="text-[9px] text-white/40 font-normal">m/s</span>`;
            document.getElementById('metric-humidity').innerHTML = `${data.humidity}<span class="text-[9px] text-white/40 font-normal">%</span>`;
            document.getElementById('metric-uv').innerText = data.uv;
            
            const iconField = document.getElementById('main-weather-icon');
            iconField.className = `fa-solid ${data.icon} text-[84px] text-white relative z-10 filter drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)]`;

            const swipeContainer = document.getElementById('forecast-row');
            swipeContainer.innerHTML = '';
            
            data.forecast.forEach((item, index) => {
                const isFirst = index === 0;
                const cardHTML = `
                    <div class="forecast-item-card flex flex-col items-center justify-between w-[72px] h-[100px] rounded-2xl border border-white/5 bg-[#262626]/20 py-3 ${isFirst ? 'forecast-active' : ''} transition-all duration-300">
                        <span class="text-[10px] ${isFirst ? 'text-white/90 font-bold' : 'text-white/40 font-medium'}">${isFirst ? 'Today' : item.day}</span>
                        <i class="fa-solid ${item.icon} text-sm my-1"></i>
                        <span class="text-xs font-semibold forecast-item-temp">--°</span>
                    </div>
                `;
                swipeContainer.insertAdjacentHTML('beforeend', cardHTML);
            });

            document.getElementById('main-temp').innerText = scaleValue(data.temp);
            renderCalculatedTemperatures();
        }
    });

    uiTimeline.to(["#main-weather-icon", "#main-temp", "#weather-condition", "#temp-bounds", "#bento-container", "#forecast-row"], {
        opacity: 1, y: 0, duration: 0.45, stagger: 0.03, ease: "power2.out"
    });
}