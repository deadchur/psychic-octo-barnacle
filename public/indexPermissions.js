async function requestAllPermissions() {
    const statusDiv = document.getElementById('permissionStatus');
    statusDiv.style.display = 'block';
    statusDiv.textContent = 'Requesting permissions...';
    statusDiv.className = 'permission-status pending';

    let allGranted = true;

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
                statusDiv.textContent = 'Device Orientation permission granted.';
            } else {
                statusDiv.textContent = 'Device Orientation permission denied.';
                statusDiv.className = 'permission-status denied';
                allGranted = false;
            }
        } catch (error) {
            statusDiv.textContent = 'Error requesting Device Orientation permission.';
            statusDiv.className = 'permission-status denied';
            allGranted = false;
        }
    }

    document.getElementById('startButton').addEventListener('click', async () => {
        const statusDiv = document.getElementById('permissionStatus');

        try {
            const permissionGranted = await requestAllPermissions();

            if (permissionGranted) {
                statusDiv.textContent = 'All permissions granted. You can now use the AR experience.';
                statusDiv.className = 'permission-status granted';

                setTimeout(() => {
                    window.location.href = 'test.html';
                }, 2000);
            } else {
                statusDiv.textContent = 'Some permissions were denied. AR experience may be limited.';
                statusDiv.className = 'permission-status denied';

                setTimeout(() => {
                    if (confirm('Some permissions were denied. Continue anyway?')) {
                        window.location.href = 'test.html';
                    } 
                }, 2000);
            }
        } catch (error) {
            statusDiv.textContent = 'Error during permission request.';
            statusDiv.className = 'permission-status denied';
        }
    });
}