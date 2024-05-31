pub fn split_csv_dataset(
    path: &str,
    train_path: &str,
    test_path: &str,
    train_ratio: f64
) -> Result<(), Box<dyn std::error::Error>> {
    let mut rdr = csv::Reader::from_path(path)?;
    let mut wtr_train = csv::Writer::from_path(train_path)?;
    let mut wtr_test = csv::Writer::from_path(test_path)?;

    for result in rdr.records() {
        let record = result?;
        let rand: f64 = rand::random();
        if rand < train_ratio {
            wtr_train.write_record(&record)?;
        } else {
            wtr_test.write_record(&record)?;
        }
    }

    wtr_train.flush()?;
    wtr_test.flush()?;

    Ok(())
}
