let map;
let markers = [];
let gridSquares = [];
let gridData = {}; // 儲存每個方格的座標點

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 25.1435, lng: 121.502 },
        zoom: 18,
        minZoom: 15,
        maxZoom: 21,
        gestureHandling: 'cooperative',
        mapTypeControl: true,
        mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT
        }
    });

    // 建立方格網
    createGrid(25.141, 121.5, 25.146, 121.504, 50);

    // 取得 Google Sheets 資料
    fetchData();

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
    const sheetId = '11dNLFa2eKrfCXZfUI8COJ_1Ydywm-TC1ebM3CBJTIWA'; // 替換成你的試算表 ID
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
                data.forEach(item => {
                    addMarker(parseFloat(item.latitude), parseFloat(item.longitude), item.name, item.timestamp); // 傳遞時間戳記
                });
            }
        });
}

function addMarker(latitude, longitude, name, timestamp) {
    const marker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: document.getElementById('showMarkers').checked ? map : null,
        title: name
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
