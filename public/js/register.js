// // public/js/auth/register.js
// document.addEventListener('DOMContentLoaded', function() {
//     const registerForm = document.getElementById('registerForm');
//     const errorMessage = document.getElementById('errorMessage');
    
//     registerForm.addEventListener('submit', async (e) => {
//       e.preventDefault();
      
//       const username = document.getElementById('username').value;
//       const email = document.getElementById('email').value;
//       const password = document.getElementById('password').value;
//       const confirmPassword = document.getElementById('confirmPassword').value;
      
//       // Client-side validation
//       if (password !== confirmPassword) {
//         errorMessage.textContent = 'Passwords do not match';
//         errorMessage.classList.add('show');
//         return;
//       }
      
//       try {
//         const response = await fetch('/auth/register', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({ username, email, password })
//         });
        
//         const data = await response.json();
        
//         if (data.success) {
//           window.location.href = data.redirect || '/home';
//         } else {
//           errorMessage.textContent = data.message || 'Registration failed';
//           errorMessage.classList.add('show');
//         }
//       } catch (error) {
//         errorMessage.textContent = 'An error occurred. Please try again.';
//         errorMessage.classList.add('show');
//       }
//     });
//   });