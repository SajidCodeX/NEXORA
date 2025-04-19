document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    const dropdowns = document.querySelectorAll(".nav-links li .dropdown");

    menuToggle.addEventListener('click', function(){
        
    })

    // Mobile dropdown toggle
    dropdowns.forEach((dropdown) => {
        dropdown.addEventListener("click", function (e) {
            e.stopPropagation(); // Prevent click bubbling
            this.parentElement.classList.toggle("show-dropdown");
        });
    });
});
