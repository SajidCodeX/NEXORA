// // public/js/auth/login.js
// document.addEventListener('DOMContentLoaded', function() {
//     const loginForm = document.getElementById('loginForm');
//     const errorMessage = document.getElementById('errorMessage');
    
//     loginForm.addEventListener('submit', async (e) => {
//       e.preventDefault();
      
//       const username = document.getElementById('username').value;
//       const password = document.getElementById('password').value;
      
//       try {
//         const response = await fetch('/auth/login', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({ username, password })
//         });
        
//         const data = await response.json();
        
//         if (data.success) {
//           window.location.href = data.redirect || '/home';
//         } else {
//           errorMessage.textContent = data.message || 'Login failed';
//           errorMessage.classList.add('show');
//         }
//       } catch (error) {
//         errorMessage.textContent = 'An error occurred. Please try again.';
//         errorMessage.classList.add('show');
//       }
//     });
// });
