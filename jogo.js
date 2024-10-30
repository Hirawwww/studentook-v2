 document.addEventListener('DOMContentLoaded', function() {
            const studentooki = document.querySelector('.studentooki');
            const obstaculo = document.querySelector('.obstaculo');
            const clouds = document.querySelector('.clouds');
            const walkingImages = ['imagens/Andando_esquerda.png', 'imagens/Andando_meio.png', 'imagens/Andando_direita.png'];
            let currentIndex = 0;
            let gameStarted = false;
            let isGameOver = false;

            let intervalId;

            // Função para iniciar o jogo
            function startGame() {
                if (!gameStarted && !isGameOver) {
                    // Iniciar as animações do obstáculo e das nuvens
                    obstaculo.style.animation = 'obstaculo-animation 1.5s infinite linear';
                    clouds.style.animation = 'clouds-animation 20s infinite linear';
                    
                    // Alterna as imagens a cada 0.3 segundos
                    intervalId = setInterval(() => {
                        studentooki.src = walkingImages[currentIndex];
                        currentIndex = (currentIndex + 1) % walkingImages.length; // alterna entre 0, 1 e 2
                    }, 300); // 0.3 segundos = 300ms

                    gameStarted = true;

                    // Inicia a verificação de colisão
                    gameLoop();
                }
            }

            // Função para o pulo
            function jump() {
                if (!isGameOver && !studentooki.classList.contains('jump')) {
                    studentooki.src = 'imagens/Pulando.png'; // Altera a imagem para a de pulo
                    studentooki.style.width = '95px';
                    studentooki.style.marginLeft = '40px';
                    studentooki.classList.add('jump');
                    setTimeout(function() {
                        studentooki.classList.remove('jump');
                    }, 800); // Ajustado para 800ms
                }
            }

            // Função que verifica colisão
            function gameLoop() {
                const loop = setInterval(() => {
                    if (isGameOver) return; // Se o jogo acabou, não verificar colisões

                    const obstaculoRect = obstaculo.getBoundingClientRect();
                    const studentookiRect = studentooki.getBoundingClientRect();

                    const isCollidingHorizontally = 
                        studentookiRect.right > obstaculoRect.left && 
                        studentookiRect.left < obstaculoRect.right;

                    const isCollidingVertically = 
                        studentookiRect.bottom > obstaculoRect.top && 
                        studentookiRect.top < obstaculoRect.bottom;

                    if (isCollidingHorizontally && isCollidingVertically) {
                        isGameOver = true;

                        // Para a animação do obstáculo e do personagem
                        obstaculo.style.animation = 'none';
                        studentooki.style.animation = 'none';

                        // Congela a posição do personagem e obstáculo
                        obstaculo.style.right = `${parseFloat(window.getComputedStyle(obstaculo).right)}px`;
                        studentooki.style.bottom = `${parseFloat(window.getComputedStyle(studentooki).bottom)}px`;

                        // Troca a imagem para "morto"
                        studentooki.src = 'imagens/Morto.png'; 
                        studentooki.style.width = '115px';
                        studentooki.style.marginLeft = `${parseFloat(window.getComputedStyle(studentooki).left)}px`;

                        clearInterval(loop); // Para o loop de detecção de colisão
                        clearInterval(intervalId); // Para o loop de troca de imagens
                    }
                }, 10);
            }

            // Inicia o jogo quando qualquer tecla é pressionada
            document.addEventListener('keydown', function(event) {
                if (!gameStarted) {
                    startGame();
                }

                if (event.code === 'Space' && !isGameOver) {
                    jump();
                }
            });
        });