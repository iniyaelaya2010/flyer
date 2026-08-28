// Flyer Delivery Tracker - Map
let deliveryMap = null;
let driverLocationMarker = null;

function initDeliveryMap() {
    const mapElement = document.getElementById('delivery-map');

    if (!mapElement) {
        console.log('Map element not found yet.');
        return;
    }

    // Create the map
    deliveryMap = L.map('delivery-map').setView([40.7128, -74.0060], 13);

    // OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(deliveryMap);

    // Show driver's location
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (driverLocationMarker) {
                    driverLocationMarker.setLatLng([lat, lng]);
                } else {
                    driverLocationMarker = L.marker([lat, lng])
                        .addTo(deliveryMap)
                        .bindPopup('📍 You are here');
                }

                deliveryMap.setView([lat, lng], 15);
            },
            function() {
                console.log('Location permission was not granted.');
            }
        );
    }
}

// Start the map when the page is ready
document.addEventListener('DOMContentLoaded', function() {
    initDeliveryMap();
});
