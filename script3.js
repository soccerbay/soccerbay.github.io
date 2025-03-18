let map;
let markers = [];
let gridSquares = [];
let gridData = {}; // 儲存每個方格的座標點
let userIcons = {}; // 儲存使用者對應的圖標

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 24.5, lng: 121 }, // 調整地圖中心點
        zoom: 8, // 調整地圖縮放層級
        minZoom: 8,
        maxZoom: 18,
        gestureHandling: 'cooperative',
        mapTypeControl: true,
        mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT
        }
    });

    // 建立方格網
    const gridAreas = [
        { south: 25.029, west: 121.511, north: 25.144, east: 121.544 },
        { south: 24.769, west: 120.944, north: 24.823, east: 121.034 },
        { south: 24.095, west: 120.649, north: 24.156, east: 120.686 }
    ];
    gridAreas.forEach(area => {
        createGrid(area.south, area.west, area.north, area.east, 400); // 網格邊長 400 公尺
    });

    // 取得 Google Sheets 資料
    // 檢查 localStorage 中是否有資料
    const storedData = localStorage.getItem('reportData');
    if (storedData) {
        const data = JSON.parse(storedData);
        data.forEach(item => {
            addMarker(parseFloat(item.latitude), parseFloat(item.longitude), item.name, item.timestamp);
        });
    } else {
        fetchData();
    }

    // 回報位置按鈕事件
    document.getElementById('report').addEventListener('click', reportLocation);

    // 顯示/隱藏標記點
    document.getElementById('showMarkers').addEventListener('change', toggleMarkers);
}

function createGrid(south, west, north, east, gridSize) {
    const latDiff = north - south;
    const lngDiff = east - west;
    const latMeters = latDiff * 111320; // 緯度每度約 111320 公尺
    const lngMeters = lngDiff * 111320 * Math.cos(south * Math.PI / 180); // 經度每度隨緯度變化

    const latSteps = Math.ceil(latMeters / gridSize);
    const lngSteps = Math.ceil(lngMeters / gridSize);

    const latStepSize = latDiff / latSteps;
    const lngStepSize = lngDiff / lngSteps;

    for (let i = 0; i < latSteps; i++) {
        for (let j = 0; j < lngSteps; j++) {
            const bounds = {
                north: south + (i + 1) * latStepSize,
                south: south + i * latStepSize,
                east: west + (j + 1) * lngStepSize,
                west: west + j * lngStepSize
            };
            const rectangle = new google.maps.Rectangle({
                strokeColor: '#000000',
                strokeOpacity: 1,
                strokeWeight: 2,
                fillColor: '#FFFFFF',
                fillOpacity: 0,
                map: map,
                bounds: bounds
            });
            gridSquares.push(rectangle);

            // 儲存方格資料
            const gridKey = `${bounds.south.toFixed(6)},${bounds.west.toFixed(6)}`;
            gridData[gridKey] = { bounds: bounds, markers: [], count: 0 };

            // 方格點擊事件
            rectangle.addListener('click', () => {
                showGridMarkers(gridKey);
            });
        }
    }
}

function reportLocation() {
    const name = document.getElementById('name').value;
    if (!name) {
        alert('未選擇姓名');
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }); // 設定時區為台灣標準時間

            // 將資料傳送到 Google Sheets
            sendData(timestamp, latitude, longitude, name);

            // 在地圖上顯示標記
            addMarker(latitude, longitude, name, timestamp); // 傳遞時間戳記

            alert('回報位置成功'); // 顯示成功訊息
        }, () => {
            alert('無法取得您的位置');
        });
    } else {
        alert('您的瀏覽器不支援地理位置');
    }
}

function sendData(timestamp, latitude, longitude, name) {
    const sheetId = '11dNLFa2eKrfCXZfUI8COJ_1Ydywm-TC1ebM3CBJTIWAD'; // 替換成你的試算表 ID
    const url = `https://script.google.com/macros/s/AKfycbzYMxyuD10axWKCrNIaENahA6BH0mK85oAt1kyPRK3M9ZG5fbvN3vMqeyT9zb5jDncw8g/exec?timestamp=${timestamp}&latitude=${latitude}&longitude=${longitude}&name=${name}`; // 替換成你的 Web App URL

    fetch(url).then(response => {
        if (response.ok) {
            console.log('資料已成功傳送');
        } else {
            console.error('資料傳送失敗');
        }
    });
}

function fetchData() {
    const sheetId = '11dNLFa2eKrfCXZfUI8COJ_1Ydywm-TC1ebM3CBJTIWA'; // 替換成你的試算表 ID
    const url = `https://script.google.com/macros/s/AKfycbzYMxyuD10axWKCrNIaENahA6BH0mK85oAt1kyPRK3M9ZG5fbvN3vMqeyT9zb5jDncw8g/exec?action=read`; // 替換成你的 Web App URL

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                // 將資料儲存到 localStorage
                localStorage.setItem('reportData', JSON.stringify(data));
                data.forEach(item => {
                    addMarker(parseFloat(item.latitude), parseFloat(item.longitude), item.name, item.timestamp); // 傳遞時間戳記
                });
            }
        });
}

function addMarker(latitude, longitude, name, timestamp) {
    // 檢查使用者是否已有對應的圖標
    if (!userIcons[name]) {
        // 如果沒有，則建立一個新的圖標
        const icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#' + Math.floor(Math.random() * 16777215).toString(16), // 隨機顏色
            fillOpacity: 0.8,
            strokeWeight: 0.5
        };
        userIcons[name] = icon;
    }

    const marker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: document.getElementById('showMarkers').checked ? map : null,
        title: name,
        icon: userIcons[name] // 使用使用者對應的圖標
    });
    markers.push(marker);

    // 將標記加入對應的方格
    addToGrid(marker, latitude, longitude, timestamp); // 傳遞時間戳記

    // 點擊標記顯示回報者姓名和時間
    marker.addListener('click', () => {
        alert(`回報者：${name}\n時間：${timestamp}`);
    });
}

function addToGrid(marker, latitude, longitude, timestamp) {
    for (const key in gridData) {
        const bounds = gridData[key].bounds;
        if (latitude >= bounds.south && latitude <= bounds.north && longitude >= bounds.west && longitude <= bounds.east) {
            gridData[key].markers.push(marker);
            gridData[key].count++; // 增加回報數
            const fillColor = `rgb(${Math.min(255, 20 + gridData[key].count * 10)}, 255, 255)`; // 計算 fillColor
            gridSquares.find(rect => rect.getBounds().equals(gridData[key].bounds)).setOptions({ fillColor: fillColor }); // 更新方格顏色
            break;
        }
    }
}

function showGridMarkers(gridKey) {
    const grid = gridData[gridKey];
    if (grid) {
        alert(`此方格共有 ${grid.markers.length} 個座標點`);
    }
}

function toggleMarkers() {
    markers.forEach(marker => {
        marker.setMap(document.getElementById('showMarkers').checked ? map : null);
    });
}
