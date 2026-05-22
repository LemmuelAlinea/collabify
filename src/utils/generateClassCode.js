export function generateClassCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'

  function randomLetters(length) {
    let result = ''

    for (let i = 0; i < length; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length))
    }

    return result
  }

  function randomNumbers(length) {
    let result = ''

    for (let i = 0; i < length; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length))
    }

    return result
  }

  return `${randomLetters(3)}-${randomNumbers(3)}-${randomNumbers(3)}`
}