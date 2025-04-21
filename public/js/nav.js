document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    const dropdowns = document.querySelectorAll(".nav-links li .dropdown");
    const profileButton = document.querySelector(".profile-button"); // Profile button

    menuToggle.addEventListener('click', function(){
        navLinks.classList.toggle("active");
    });

    // Mobile dropdown toggle
    dropdowns.forEach((dropdown) => {
        dropdown.addEventListener("click", function (e) {
            e.stopPropagation(); // Prevent click bubbling
            this.parentElement.classList.toggle("show-dropdown");
        });
    });

    // Handle logout button click
    if (profileButton) {
        profileButton.addEventListener("click", function() {
            // Redirect to logout route
            window.location.href = "/logout"; // Adjust URL to your logout route
        });
    }
});
