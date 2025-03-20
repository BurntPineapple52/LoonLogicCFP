document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Trial form submission
    const form = document.getElementById('trialForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = {
            website: document.getElementById('website').value,
            email: document.getElementById('email').value
        };
        
        console.log('Trial Request:', formData);
        alert('Success! We\'re cloning your site to free hosting.\nYou\'ll receive access details within 24 hours.');
        form.reset();
    });
});