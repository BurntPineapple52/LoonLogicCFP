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
    document.getElementById('myForm').addEventListener('submit', async (e) => {
      e.preventDefault()
      const website = document.getElementById('website').value
      const email = document.getElementById('email').value
    
      const response = await fetch('https://your-worker.your-domain.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ website, email })
      })
    
      const result = await response.text()
      console.log(result)
    })

        alert('Success! We\'re cloning your site to free hosting.\nYou\'ll receive access details within 24 hours.');
        form.reset();
    });
});
