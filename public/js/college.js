document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.querySelector("select");  // Selecting the dropdown element

    // Event 1: When the dropdown is clicked (focused), expand it
    dropdown.addEventListener("focus", () => {
        dropdown.classList.add("expanded");  // Adds a class to increase margin-bottom
    });

    // Event 2: When an option is selected, shrink it back
    dropdown.addEventListener("change", () => {
        setTimeout(() => {
            dropdown.classList.remove("expanded");  // Removes the class to shrink back
            dropdown.blur();  // This removes focus, resetting dropdown behavior
        }, 100);  // Adding delay for smooth transition
    });
});
