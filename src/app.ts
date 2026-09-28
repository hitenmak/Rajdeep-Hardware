import expressLayouts from 'express-ejs-layouts';
import session from 'express-session';
import express from 'express';
import useragent from 'express-useragent';
import cors from 'cors';
import path from 'path';
// import flash from 'express-flash-message';
// import morgan from 'morgan';
// import helmet from 'helmet';

// Others
import Config from './config';

// Routes
import routes from './routes/index';
import AllowOrigin from './middleware/AllowOrigin';
import BodyTrimmer from './middleware/BodyTrimmer';

const app: express.Application = express();

//--------------------------------------------------------------

app.use(cors());
app.use(expressLayouts);
// app.use(helmet());


// Body Parsing Middleware {
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// } Body Parsing Middleware


// Setup Express Session {
app.use(session(Config.EXPRESS_SESSION));
// } Setup Express Session


// Setup Flash {
// app.use(flash({ sessionKeyName: 'express-flash-message' }));
// } Setup Flash


// Custom Middleware {
app.use(AllowOrigin);
app.use(BodyTrimmer);
app.use(useragent.express());
// } Custom Middleware


// Ignore Crawling {
app.use('/robots.txt', (req, res) => {
	res.type('text/plain');
	res.send('User-member: *\nDisallow: /');
});
// } Ignore Crawling


app.use('/storage', express.static(__dirname + '/../storage'));
app.use('/resource', express.static(path.join(__dirname, 'public')));

// Self-hosted Tabler/FontAwesome assets (avoids relying on a CDN)
app.use('/vendor/tabler', express.static(path.join(__dirname, '../node_modules/@tabler/core/dist')));
app.use('/vendor/fontawesome', express.static(path.join(__dirname, '../node_modules/@fortawesome/fontawesome-free')));
app.use('/vendor/chart.js', express.static(path.join(__dirname, '../node_modules/chart.js/dist')));


app.set('views', [path.join(__dirname, 'views')])
app.set('view engine', 'ejs');


// Routes {
app.use('/', routes);
// } Routes

//--------------------------------------------------------------
export default app;