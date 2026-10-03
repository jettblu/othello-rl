pub fn add(left: usize, right: usize) -> usize {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}

#[cfg(feature = "training")]
pub mod agent;
pub mod gameplay;
#[cfg(feature = "training")]
pub mod model;
#[cfg(feature = "training")]
pub mod simulate;
