
try {
    const footer = await fetch('/pages/footer.html');
    const response = await footer.text();
    document.getElementById('footer-container').innerHTML = response;
} catch (error) {
    console.error('Error loading footer:', error);
}


