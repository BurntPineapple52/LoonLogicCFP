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

  // Handle form submission
  const form = document.getElementById('trialForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form input values
    const website = document.getElementById('website').value.trim();
    const email = document.getElementById('email').value.trim();
    
    if (!website || !email) {
      alert('Please fill out both the website and email fields.');
      return;
    }
    
    try {
      const response = await fetch('https://my-first-worker.maxroth52.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ website, email })
      });
      
      const result = await response.text();
      console.log(result);
      
      alert('Success! We\'re cloning your site to free hosting.\nYou\'ll receive access details within 24 hours.');
    } catch (error) {
      console.error('Error:', error);
      alert('There was an error processing your request.');
    }
    
    // Reset the form after submission
    form.reset();
  });
});
