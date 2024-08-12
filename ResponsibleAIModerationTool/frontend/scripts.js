document.getElementById('moderateButton').addEventListener('click', () => {
    const content = document.getElementById('contentInput').value;

    fetch('/moderate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    })
        .then(response => response.json())
        .then(data => {
            // Extracting and displaying only the text from the response
            const text = data.candidates[0].content.parts[0].text;
            document.getElementById('result').textContent = text;
        })
        .catch(error => console.error('Error:', error));
});
