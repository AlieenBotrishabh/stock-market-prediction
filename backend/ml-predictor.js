/**
 * ML Pipeline Integration Module
 * Connects to Python ML pipeline for stock price predictions
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to ML pipeline directory
const ML_PIPELINE_DIR = path.join(__dirname, '../ml-pipeline');

/**
 * Make a prediction using the ML pipeline
 * @param {string} symbol - Stock symbol (e.g., "TCS")
 * @returns {Promise<object>} Prediction result
 */
async function makePrediction(symbol) {
    return new Promise((resolve, reject) => {
        // Create a simple Python script to make predictions
        const pythonScript = `
import sys
import json
import os
sys.path.insert(0, '${ML_PIPELINE_DIR}')

try:
    # Set dummy API key for testing
    if not os.getenv('INDIANAPI_KEY'):
        os.environ['INDIANAPI_KEY'] = 'test_key'
    
    from model import StockPricePredictor
    from data_processor import DataProcessor
    from config import Config
    import numpy as np
    
    symbol = '${symbol}'
    
    # Try to load previously trained model
    model = StockPricePredictor.load(symbol)
    
    if model is None:
        # Model not trained yet
        print(json.dumps({
            'success': False,
            'error': f'Model for {symbol} not trained yet. Run: python main.py --full'
        }))
    else:
        # Load processed data
        processor = DataProcessor()
        df = processor.load_processed_data(symbol)
        
        if df is None:
            print(json.dumps({
                'success': False,
                'error': f'No processed data for {symbol}. Run: python main.py --collect --process'
            }))
        else:
            # Get latest data
            latest_price = float(df['close'].iloc[-1])
            
            # Create dummy sequences for demo (use last 10 days)
            X_last = df[['open', 'high', 'low', 'close', 'volume', 'sma_5', 'sma_10', 'sma_20', 
                          'ema_5', 'ema_10', 'ema_20', 'rsi_14', 'roc', 'volatility', 'return']].tail(10).values
            
            if len(X_last) == 10:
                # Normalize and predict
                X_normalized = processor.normalize_data(np.array([X_last]), fit=False)
                prediction = model.predict(X_normalized)[0][0]
                
                price_change = prediction - latest_price
                price_change_percent = (price_change / latest_price) * 100
                
                print(json.dumps({
                    'success': True,
                    'symbol': symbol,
                    'currentPrice': float(latest_price),
                    'predictedPrice': float(prediction),
                    'priceChange': float(price_change),
                    'priceChangePercent': float(price_change_percent),
                    'direction': 'UP' if price_change > 0 else 'DOWN',
                    'confidence': 'Medium',
                    'dataPoints': len(df)
                }))
            else:
                print(json.dumps({
                    'success': False,
                    'error': 'Insufficient historical data'
                }))

except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e)
    }))
`;

        // Run Python script
        const python = spawn('python', ['-c', pythonScript], {
            cwd: ML_PIPELINE_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        python.on('close', (code) => {
            try {
                // Extract JSON from output (ignore warnings)
                const jsonMatch = output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    resolve(result);
                } else {
                    reject(new Error('No valid JSON output from Python script'));
                }
            } catch (err) {
                reject(new Error(`Failed to parse prediction: ${err.message}\nOutput: ${output}\nError: ${errorOutput}`));
            }
        });
    });
}

/**
 * Get prediction status (check if model is trained)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<object>} Status information
 */
async function getPredictionStatus(symbol) {
    return new Promise((resolve, reject) => {
        const pythonScript = `
import sys
import json
import os
from pathlib import Path
sys.path.insert(0, '${ML_PIPELINE_DIR}')

try:
    if not os.getenv('INDIANAPI_KEY'):
        os.environ['INDIANAPI_KEY'] = 'test_key'
    
    from config import Config
    from model import StockPricePredictor
    from data_processor import DataProcessor
    
    symbol = '${symbol}'
    
    # Check if model exists
    model_path = Config.get_model_path(symbol)
    model_exists = model_path.exists()
    
    # Check if processed data exists
    data_path = Config.get_processed_data_path(symbol)
    data_exists = data_path.exists()
    
    status = {
        'symbol': symbol,
        'modelTrained': model_exists,
        'dataProcessed': data_exists,
        'ready': model_exists and data_exists
    }
    
    if model_exists:
        # Load metadata
        metadata_path = model_path.with_suffix('.json')
        if metadata_path.exists():
            import json as json_module
            with open(metadata_path) as f:
                metadata = json_module.load(f)
                status['metrics'] = metadata
    
    print(json.dumps(status))

except Exception as e:
    print(json.dumps({
        'symbol': '${symbol}',
        'error': str(e)
    }))
`;

        const python = spawn('python', ['-c', pythonScript], {
            cwd: ML_PIPELINE_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.on('close', (code) => {
            try {
                const jsonMatch = output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    resolve(result);
                } else {
                    reject(new Error('No valid JSON output'));
                }
            } catch (err) {
                reject(new Error(`Failed to parse status: ${err.message}`));
            }
        });
    });
}

module.exports = {
    makePrediction,
    getPredictionStatus
};
